import React from 'react';

import 'meilisearch-docsearch/css'

const SearchPage = () => {
  const docsearchRef = React.useRef(null);

  React.useEffect(() => {
    const docsearch = require('meilisearch-docsearch').default
    const destroy = docsearch({
      host: 'http://localhost:7700',
      apiKey:
        'masterKey',
      indexUid: 'docusaurus-docsearch',
      container: '#docsearch',
      debug: true
    })

    return () => destroy()
  }, [])

  React.useEffect(() => {
    docsearchRef.current.firstChild.click();
    const elem = document.querySelector(".docsearch-modal-search-input") as HTMLInputElement
    if (elem) {
      elem.focus();
      elem.value = "g"
      elem.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event
    }
    return () => {
      if (docsearchRef.current) {
        docsearchRef.current.unsubscribe();
      }
    };
  }, []);

  return (
    <div>
      <div ref={docsearchRef} id="docsearch"></div>
    </div>
  )
}

export default SearchPage
