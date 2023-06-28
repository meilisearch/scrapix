import React from 'react';
import 'instantsearch.css/themes/algolia-min.css'
import { InstantSearch, SearchBox, Hits, Highlight, Configure } from 'react-instantsearch-dom'

import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';
// import '@meilisearch/instant-meilisearch/template.css'

const searchClient = instantMeiliSearch("http://localhost:7700", "masterKey", { primaryKey: "uid" });

const Hit = ({ hit }) => {
  return (<div key={hit.uid}>
    <div className="hit-name">
      <Highlight attribute="h1" hit={hit} />
    </div>
    <div className="hit-name">
      <Highlight attribute="h2" hit={hit} />
    </div>
    <div className="hit-name">
      <Highlight attribute="h3" hit={hit} />
    </div>
    <div className="hit-name">
      {hit.p.join(' ')}
    </div>
  </div>)
}

const CustomPage: React.FC = () => {


  React.useEffect(() => {
    const searchInput = document.querySelector(".ais-SearchBox input") as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }, []);

  return (
    <div>
      <h1>Docusaurus with default strategy</h1>
      <InstantSearch indexName="docusaurus-default" searchClient={searchClient}>
        <Configure
          hitsPerPage={10}
          attributesToSnippet={['p:50']}
          snippetEllipsisText={'...'}
        />
        <SearchBox />
        <Hits hitComponent={Hit} />
      </InstantSearch>
    </div>
  );
};

export default CustomPage;
