# Run linting tests

```sh
yarn lint # to test
yarn lint:fix # to fix errors
```

# Running in dev mode

```sh
yarn dev:build
```

Running this mode rebuilds scrapix on every change made in the source files (`./src`)

# Running the playground

```sh
yarn playground
```

Running this mode has two effects.
- If you change the source code of the docusaurus playground, the docusaurus app restarts.
- If you change the source code of scrapix, scrapix is rebuilded and re-runs a scrapper on the docusaurus app.


# Re-scrap a chosen app on change

If you which to re-scrap an app based on a custom scrapix configuration file, run the following:

```sh
npx nodemon --watch src --watch "[PATH_TO_YOUR_CONFIG_FILE]" --ext ts,json --exec "yarn start -c [PATH_TO_YOUR_CONFIG_FILE]"
```

This will scrap an app based on the provided "PATH_TO_YOUR_CONFIG_FILE" on every change in the `./src` folder and on your provided config file.
