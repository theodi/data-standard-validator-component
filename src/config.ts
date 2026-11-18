/*
 * What the validator is configured with, and how its URLs become fetchable.
 *
 * Kept free of the DOM and of engine values: a host page's main thread imports it
 * for its config, and Node tests import it to load the same standards.
 * Pulling in the RDF stack here would add ~500 kB to the main-thread bundle.
 */

import type { PatternHint } from '@theodi/data-standard-validator'

export interface ValidatorConfig {
  standards: StandardConfig[]
  /**
   * Git ref put into every GitHub-hosted shape and context URL. Defaults to
   * the ref written in the first GitHub shape URL.
   */
  ref?: string
  /**
   * What the Version box offers from the shapes repository: its branches (the
   * default) or its tags. The starting ref is listed either way.
   */
  versions?: VersionKind
  /**
   * Plain-English names for the `sh:pattern` regexes the shapes use, for
   * shapes that carry no `sh:message` of their own.
   */
  patterns?: PatternHint[]
  /** Shown in the empty editor. */
  placeholder?: string
  /**
   * Read `shape`, `context`, `csvw` and `example` from the page's query
   * string on load, to open on that standard and example. Defaults to true.
   */
  urlParams?: boolean
}

export interface StandardConfig {
  /** The picker label, and what the verdict line says was checked. */
  name: string
  /** Help text under the picker. */
  description?: string
  /** SHACL shapes in Turtle, merged into one dataset in this order. */
  shapes: string | string[]
  /**
   * A JSON-LD context that replaces each record's own `@context`. Without
   * one, the record's own `@context` is loaded instead.
   */
  context?: string
  /**
   * CSVW metadata that says how a CSV file of this standard becomes RDF.
   * The standard offers CSV only when it has one.
   */
  csvMetadata?: string
  /**
   * Offered under "Example". A bare URL is named after its file. A URL
   * ending in `.csv` is a CSV example; anything else is JSON.
   */
  examples?: (string | { name: string, url: string })[]
}

/** Which of a GitHub repository's refs the Version box lists. */
export type VersionKind = 'branches' | 'tags'

/** What the person is validating. An example's format comes from its extension. */
export type DataFormat = 'json' | 'csv'

export interface GitHubFile { owner: string, repo: string, ref: string, path: string }

/** What `loadValidator` needs for one standard at one ref. */
export interface ResolvedStandard { shapes: string[], context?: string, csvMetadata?: string }

/*
 * The ref is taken to be a single path segment. A ref containing `/` cannot
 * be told apart from the path in a URL, but can still be typed into the ref box.
 */
const BLOB = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/
const RAW = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/

export function parseGitHubUrl (url: string): GitHubFile | undefined {
  const match = BLOB.exec(url) ?? RAW.exec(url)
  if (!match) return undefined
  const [, owner, repo, ref, path] = match as unknown as [string, string, string, string, string]
  return { owner, repo, ref, path }
}

/**
 * A URL a browser can fetch. GitHub page links become raw links, since only
 * raw.githubusercontent.com answers cross-origin requests; `ref` replaces the
 * ref written in the URL. Anything else is fetched as written.
 */
export function fetchUrl (url: string, ref?: string): string {
  const file = parseGitHubUrl(url)
  if (!file) return url
  return `https://raw.githubusercontent.com/${file.owner}/${file.repo}/${ref ?? file.ref}/${file.path}`
}

export function shapeList (standard: StandardConfig): string[] {
  return typeof standard.shapes === 'string' ? [standard.shapes] : standard.shapes
}

export function resolveStandard (standard: StandardConfig, ref?: string): ResolvedStandard {
  return {
    shapes: shapeList(standard).map((url) => fetchUrl(url, ref)),
    ...(standard.context !== undefined ? { context: fetchUrl(standard.context, ref) } : {}),
    ...(standard.csvMetadata !== undefined ? { csvMetadata: fetchUrl(standard.csvMetadata, ref) } : {}),
  }
}

/**
 * A URL a person can open: a GitHub file's page at `ref`, so the link shows
 * the file people are validating against rather than a raw download.
 */
export function pageUrl (url: string, ref?: string): string {
  const file = parseGitHubUrl(url)
  if (!file) return url
  return `https://github.com/${file.owner}/${file.repo}/blob/${ref ?? file.ref}/${file.path}`
}

function fileName (url: string): string {
  return decodeURIComponent(url.replace(/[?#].*$/, '').replace(/^.*\//, ''))
}

function extension (url: string): string {
  const match = /\.([^./]+)$/.exec(fileName(url))
  return match ? match[1]!.toLowerCase() : ''
}

/** The format a URL or file name announces: CSV for `.csv`, JSON for anything else. */
export function formatOf (url: string): DataFormat {
  return extension(url) === 'csv' ? 'csv' : 'json'
}

/** The formats a standard accepts. JSON always; CSV once it has CSVW metadata. */
export function formatsOf (standard: StandardConfig): DataFormat[] {
  return standard.csvMetadata !== undefined ? ['json', 'csv'] : ['json']
}

export interface StandardFile {
  label: 'Shape' | 'Context' | 'CSVW mapping'
  /** `.ttl`, `.jsonld`, `.json`, as the link shows it. */
  ext: string
  /** The file's page, at the ref the shapes are read from. */
  url: string
}

/**
 * The files a standard is made of, for linking to: its shapes, and whichever
 * of the context or the CSVW mapping applies to the format being validated.
 */
export function standardFiles (standard: StandardConfig, format: DataFormat, ref?: string): StandardFile[] {
  const file = (label: StandardFile['label'], url: string): StandardFile => {
    const ext = extension(url)
    return { label, ext: ext !== '' ? `.${ext}` : '', url: pageUrl(url, ref) }
  }
  const files = shapeList(standard).map((url) => file('Shape', url))
  if (format === 'json' && standard.context !== undefined) files.push(file('Context', standard.context))
  if (format === 'csv' && standard.csvMetadata !== undefined) files.push(file('CSVW mapping', standard.csvMetadata))
  return files
}

function firstGitHubShape (config: ValidatorConfig): GitHubFile | undefined {
  for (const standard of config.standards) {
    for (const url of shapeList(standard)) {
      const file = parseGitHubUrl(url)
      if (file) return file
    }
  }
  return undefined
}

/** The ref the version box starts at; undefined when nothing is versionable. */
export function defaultRef (config: ValidatorConfig): string | undefined {
  return config.ref ?? firstGitHubShape(config)?.ref
}

/** A GitHub repository, as the Version box names, links and lists it. */
export interface GitHubRepo { owner: string, repo: string, name: string, url: string }

/** Where the shapes live: the repository the Version box lists refs from. */
export function shapesRepo (config: ValidatorConfig): GitHubRepo | undefined {
  const file = firstGitHubShape(config)
  if (!file) return undefined
  const name = `${file.owner}/${file.repo}`
  return { owner: file.owner, repo: file.repo, name, url: `https://github.com/${name}` }
}

/** Whether a URL is a GitHub file in the repository the shapes are versioned in. */
export function inShapesRepo (config: ValidatorConfig, url: string): boolean {
  const repo = firstGitHubShape(config)
  const file = parseGitHubUrl(url)
  return repo !== undefined && file !== undefined && file.owner === repo.owner && file.repo === repo.repo
}

/**
 * Where to fetch an example from. One in the shapes' repository is read at
 * `ref`, so it is the example that goes with those shapes. One anywhere else is
 * fetched as written: the ref names a revision of the shapes' repository only.
 */
export function exampleFetchUrl (config: ValidatorConfig, url: string, ref?: string): string {
  return fetchUrl(url, ref !== undefined && inShapesRepo(config, url) ? ref : undefined)
}

/** The standard's examples, named; only those in `format` when it is given. */
export function exampleList (standard: StandardConfig, format?: DataFormat): { name: string, url: string }[] {
  return (standard.examples ?? [])
    .map((example) => typeof example === 'string'
      ? { name: fileName(example).replace(/\.[^.]+$/, ''), url: example }
      : example)
    .filter((example) => format === undefined || formatOf(example.url) === format)
}

/** What a link to the page asks for: `?shape=...&context=...&csvw=...&example=...`. */
export interface LinkParams { shapes: string[], context?: string, csvMetadata?: string, example?: string }

/** The standard (by index), shapes ref and example a link resolves to. */
export interface LinkMatch { standardIndex: number, ref?: string, example?: string }

export function parseLinkParams (search: string): LinkParams {
  const params = new URLSearchParams(search)
  const context = params.get('context')
  const csvMetadata = params.get('csvw')
  const example = params.get('example')
  // Repeated `shape=` covers a standard whose shapes are several files.
  const shapes = params.getAll('shape').filter((url) => url !== '')
  return {
    shapes,
    ...(context !== null && context !== '' ? { context } : {}),
    ...(csvMetadata !== null && csvMetadata !== '' ? { csvMetadata } : {}),
    ...(example !== null && example !== '' ? { example } : {}),
  }
}

/*
 * GitHub files are the same file at any ref and through either host: a link
 * at a tag still names the standard configured at `main`.
 */
function sameFile (a: string, b: string): boolean {
  const fa = parseGitHubUrl(a)
  const fb = parseGitHubUrl(b)
  if (fa && fb) return fa.owner === fb.owner && fa.repo === fb.repo && fa.path === fb.path
  return fetchUrl(a) === fetchUrl(b)
}

/** The configured standard a link names, or undefined when it names none. */
export function matchLink (config: ValidatorConfig, link: LinkParams): LinkMatch | undefined {
  const { shapes, context, csvMetadata, example } = link
  if (shapes.length === 0 && context === undefined && csvMetadata === undefined && example === undefined) return undefined
  const hasExample = (standard: StandardConfig, url: string): boolean =>
    exampleList(standard).some((e) => sameFile(e.url, url))
  const same = (configured: string | undefined, linked: string | undefined): boolean =>
    linked === undefined || (configured !== undefined && sameFile(configured, linked))
  const standardIndex = config.standards.findIndex((standard) => {
    if (shapes.length === 0 && context === undefined && csvMetadata === undefined) return hasExample(standard, example!)
    return shapes.every((url) => shapeList(standard).some((s) => sameFile(s, url))) &&
      same(standard.context, context) && same(standard.csvMetadata, csvMetadata)
  })
  if (standardIndex === -1) return undefined
  const standard = config.standards[standardIndex]!
  // The standard's own files say which version to use. An example says so too,
  // but only when it lives with the shapes: elsewhere its ref is another repository's.
  const ref = defaultRef(config) === undefined
    ? undefined
    : [...shapes, ...[context, csvMetadata].filter((url) => url !== undefined),
        ...(example !== undefined && inShapesRepo(config, example) ? [example] : [])]
        .map((url) => parseGitHubUrl(url)?.ref)
        .find((r) => r !== undefined)
  // The configured URL, so the picker shows it selected; an unlisted one still loads.
  const exampleUrl = example === undefined
    ? undefined
    : exampleList(standard).find((e) => sameFile(e.url, example))?.url ?? example
  return {
    standardIndex,
    ...(ref !== undefined ? { ref } : {}),
    ...(exampleUrl !== undefined ? { example: exampleUrl } : {}),
  }
}
