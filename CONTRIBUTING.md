# Coding with AI

We accept the use of AI-powered tools (GitHub Copilot, ChatGPT, Claude, Cursor, etc.) for contributions, whether for code, tests, or documentation.

⚠️ However, transparency is required: if you use AI assistance, please mention it in your PR description. This helps maintainers during code review and ensure the quality of contributions.

What we expect:
- **Disclose AI usage**: A simple note like "Used GitHub Copilot for autocompletion" or "Generated initial test structure with ChatGPT" is sufficient.
- **Specify the scope**: Indicate which parts of your contribution involved AI assistance.
- **Review AI-generated content**: Ensure you understand and have verified any AI-generated code before submitting.

# Run linting tests

```sh
yarn lint # to test
yarn lint:fix # to fix errors
```

# Running in dev mode

```sh
# Run the build in watch mode
yarn dev:build
```

Running this mode rebuilds scrapix on every change made in the source files (`./src`)

# Running the playground

```sh
yarn playground:docsearch
yarn playground:default
```

Running this mode has two effects.

- If you change the source code of the docusaurus playground, the docusaurus app restarts.
- If you change the source code of scrapix, scrapix is rebuilded and re-runs a scrapper (either the default one or the docsearch one) on the docusaurus app.

# Re-scrap a chosen app on change

If you which to re-scrap an app based on a custom scrapix configuration file, run the following:

```sh
npx nodemon --watch src --watch "[PATH_TO_YOUR_CONFIG_FILE]" --ext ts,json --exec "yarn start -c [PATH_TO_YOUR_CONFIG_FILE]"
```

This will scrap an app based on the provided "PATH_TO_YOUR_CONFIG_FILE" on every change in the `./src` folder and on your provided config file.

## Publish

To publish scrapix to npm. Increase its version and then:

```sh
yarn build
npm publish .
```
