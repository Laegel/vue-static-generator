# vue-static-generator
A Vue SSR generator to take advantage of SEO, versatility and Vue awesomeness (oh no, this intro is definitely not objective).

A small package made in order to fill the only thing [Nuxt](https://nuxtjs.org/) doesn't provide: an "on-demand" Vue server side rendering.

Still working on it, if anyone has troubles to set it up, do not hesitate to contact me.

## Use case
As I was building a CMS and wanted to use Vue and SSR (yeah I know, that's quite an edge case) for SEO, I looked for existing libraries that could suit my needs. Unfortunately, I didn't find anything, that's why I decided to create this package.

## Features
With this package, you're able to generate a whole website or do it page by page.

Multilingual is a core feature, as it's directly implied in the generation process.

Although sitemap plays an important role in SEO, I'm still wondering if it should belong to core or if it shall be a kind of module. 

## Installation
`npm i -S vue-static-decorator`

or

`yarn add vue-static-decorator -S`

Please note that you need the modules from your bundle JSON file to be installed and that "vue-server-renderer" package version must match Vue's.

## Configuration

```typescript
interface GenerateConfiguration {
    baseURI: string,
    languages: {
        [languageCode: string]: LanguageConfiguration
    },
    fileIndex?: string, // default "index"
    fileExtension?: string, // default ".html",
    fileWriter?: Function, // default file writer will just write the file at the location, can be customized
    targetDirectory?: string // default "./dist"
}

interface LanguageConfiguration {
    defaultTitle: string,
    routes: RouteConfiguration[]
}

interface RouteConfiguration {
    path: string,
    children?: RouteConfiguration[]
    regenerate?: string[] | () => string[],
    type?: string, // Used when defining a type

    // Those are required when route has a "type" property
    data?: any[] | () => any[], 
    resolver?: string | () => string
}
```

### GenerateConfiguration
The main configuration object.

At least one language must be used in the "languages" property.

### LanguageConfiguration
The language configuration object.

As routes may differ between all languages, route configurations are separated.

### RouteConfiguration
The route configuration object.

"regenerate" is used to tell the generator to refresh specific paths (e.g. a homepage that would display our latest posts).

"data" is the input of data that will mainly* be used when generating the whole project.

"resolver" corresponds to the way the "path" property will be resolved. As sometimes you'll need to use variables in your paths, the only way to resolve it is to provide a callback to process your data and output the expected path.

\* *mainly*, as you could also use it in any callback property, for example.

## API
This package provides two classes:

```typescript
interface GeneratorWrapper {
    static create(config, bundle, options);

    static async initialize(): Promise[];

    static async generateByRoute(route, options): Promise[];

    static async generateByType(type, ids, options): Promise[];
}
```
This is a wrapper for the Generator class, the direct generator feature access.

If the wrapper doesn't fit your need, you can still build your own around the Generator class:

```typescript
interface Generator {
    constructor(config, bundle, options = null);

    generateByArgs(args): Promise[];

    generateAll(): Promise[];
}
```