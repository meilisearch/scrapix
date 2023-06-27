import React from 'react'
import 'meilisearch-docsearch/css'

const SearchPage: React.FC = () => {
  React.useEffect(() => {
    const docsearch = require('meilisearch-docsearch').default
    const destroy = docsearch({
      host: 'http://localhost:7700',
      apiKey:
        'masterKey',
      indexUid: 'scrapix-docusaurus',
      container: '#docsearch',
      debug: true
    })

    return () => destroy()
  }, [])

  return (
    <div>
      <div id="docsearch"></div>
    </div>
  )
}

export default SearchPage
