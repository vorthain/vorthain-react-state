import React, { createContext, useContext, useReducer, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createVorthainStore, useVglobal, useVstate, vAction } from '../src/index';

// Render counter hook
const useRenderCounter = (componentName) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  React.useEffect(() => {
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
};

// ============ REACT REDUCER IMPLEMENTATION ============

const initialState = {
  drawers: [
    {
      id: 'drawer1',
      folders: [
        {
          id: 'drawer1-folder1',
          pages: [
            {
              id: 'drawer1-folder1-page1',
              title: 'Page 1 []',
              content: 'Page 1 Content []'
            }
          ]
        }
      ]
    },
    {
      id: 'drawer2',
      folders: [
        {
          id: 'drawer2-folder1',
          pages: [
            {
              id: 'drawer2-folder1-page1',
              title: 'Page 1 {}',
              content: 'Page 1 Content {}'
            }
          ]
        },
        {
          id: 'drawer2-folder2',
          pages: [
            {
              id: 'drawer2-folder2-page1',
              title: 'Page 1 ()',
              content: 'Page 1 Content ()'
            },
            {
              id: 'drawer2-folder2-page2',
              title: 'Page 2 ()',
              content: 'Page 2 Content ()'
            }
          ]
        }
      ]
    }
  ]
};

const drawersReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_PAGE_TITLE':
      return {
        ...state,
        drawers: state.drawers.map((drawer) => ({
          ...drawer,
          folders: drawer.folders.map((folder) => ({
            ...folder,
            pages: folder.pages.map((page) =>
              page.id === action.pageId ? { ...page, title: action.newTitle } : page
            )
          }))
        }))
      };
    default:
      return state;
  }
};

const DrawersContext = createContext();

const DrawersProvider = ({ children }) => {
  const [state, dispatch] = useReducer(drawersReducer, initialState);
  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return React.createElement(DrawersContext.Provider, { value }, children);
};

const useDrawersContext = () => {
  const context = useContext(DrawersContext);
  if (!context) {
    throw new Error('useDrawersContext must be used within DrawersProvider');
  }
  return context;
};

// React Reducer Components (with React.memo optimization)
const ReducerPage = React.memo(({ page }) => {
  const renderCount = useRenderCounter(`ReducerPage-${page.id}`);
  const { dispatch } = useDrawersContext();

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #ccc',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#f0f8ff'
      }
    },
    React.createElement('div', null, `Page ${page.id} (Renders: ${renderCount})`),
    React.createElement('div', null, `Title: ${page.title}`),
    React.createElement('div', null, `Content: ${page.content}`),
    React.createElement(
      'button',
      {
        onClick: () => {
          dispatch({
            type: 'UPDATE_PAGE_TITLE',
            pageId: page.id,
            newTitle: page.title + ' - Edited'
          });
        }
      },
      'Change page title (Reducer)'
    )
  );
});

const ReducerFolder = React.memo(({ folder }) => {
  const renderCount = useRenderCounter(`ReducerFolder-${folder.id}`);

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #999',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#f5f5f5'
      }
    },
    React.createElement('div', null, `Folder ${folder.id} (Renders: ${renderCount})`),
    ...folder.pages.map((page) => React.createElement(ReducerPage, { key: page.id, page }))
  );
});

const ReducerDrawer = React.memo(({ drawer }) => {
  const renderCount = useRenderCounter(`ReducerDrawer-${drawer.id}`);

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #666',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fafafa'
      }
    },
    React.createElement('div', null, `Drawer ${drawer.id} (Renders: ${renderCount})`),
    ...drawer.folders.map((folder) =>
      React.createElement(ReducerFolder, { key: folder.id, folder })
    )
  );
});

const ReducerDrawers = () => {
  const renderCount = useRenderCounter('ReducerDrawers');
  const { state } = useDrawersContext();

  return React.createElement(
    'div',
    {
      style: {
        border: '2px solid #333',
        margin: '10px',
        padding: '15px',
        backgroundColor: '#e6f3ff'
      }
    },
    React.createElement('h3', null, `React useReducer Implementation (Renders: ${renderCount})`),
    ...state.drawers.map((drawer) => React.createElement(ReducerDrawer, { key: drawer.id, drawer }))
  );
};

// ============ YOUR VORTHAIN IMPLEMENTATION (FIXED) ============

class RootStore {
  constructor() {}

  drawers = [
    {
      id: 'drawer1',
      folders: [
        {
          id: 'drawer1-folder1',
          pages: [
            {
              id: 'drawer1-folder1-page1',
              title: 'Page 1 []',
              content: 'Page 1 Content []'
            }
          ]
        }
      ]
    },
    {
      id: 'drawer2',
      folders: [
        {
          id: 'drawer2-folder1',
          pages: [
            {
              id: 'drawer2-folder1-page1',
              title: 'Page 1 {}',
              content: 'Page 1 Content {}'
            }
          ]
        },
        {
          id: 'drawer2-folder2',
          pages: [
            {
              id: 'drawer2-folder2-page1',
              title: 'Page 1 ()',
              content: 'Page 1 Content ()'
            },
            {
              id: 'drawer2-folder2-page2',
              title: 'Page 2 ()',
              content: 'Page 2 Content ()'
            }
          ]
        }
      ]
    }
  ];
}

createVorthainStore(RootStore);

/** @returns {RootStore} */
const useVorthainDrawerStore = () => {
  return useVglobal();
};

const VorthainPage = ({ page }) => {
  const renderCount = useRenderCounter(`VorthainPage-${page.id}`);

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #ccc',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fff0f5'
      }
    },
    React.createElement('div', null, `Page ${page.id} (Renders: ${renderCount})`),
    React.createElement('div', null, `Title: ${page.title}`),
    React.createElement('div', null, `Content: ${page.content}`),
    React.createElement(
      'button',
      {
        onClick: () => {
          page.title = page.title + ' - Edited';
        }
      },
      'Change page title (Vorthain)'
    )
  );
};

const VorthainFolder = ({ folder }) => {
  const renderCount = useRenderCounter(`VorthainFolder-${folder.id}`);

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #999',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#f5f5f5'
      }
    },
    React.createElement('div', null, `Folder ${folder.id} (Renders: ${renderCount})`),
    ...folder.pages.map((page) => React.createElement(VorthainPage, { key: page.id, page }))
  );
};

const VorthainDrawer = ({ drawer }) => {
  const renderCount = useRenderCounter(`VorthainDrawer-${drawer.id}`);

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #666',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fafafa'
      }
    },
    React.createElement('div', null, `Drawer ${drawer.id} (Renders: ${renderCount})`),
    ...drawer.folders.map((folder) =>
      React.createElement(VorthainFolder, { key: folder.id, folder })
    )
  );
};

const VorthainDrawers = () => {
  const renderCount = useRenderCounter('VorthainDrawers');
  const store = useVorthainDrawerStore();

  return React.createElement(
    'div',
    {
      style: {
        border: '2px solid #333',
        margin: '10px',
        padding: '15px',
        backgroundColor: '#ffe6f0'
      }
    },
    React.createElement('h3', null, `Vorthain Implementation (Renders: ${renderCount})`),
    ...store.drawers.map((drawer) =>
      React.createElement(VorthainDrawer, { key: drawer.id, drawer })
    )
  );
};

// ============ MAIN APP ============

const App = () => {
  const renderCount = useRenderCounter('App');

  return React.createElement(
    'div',
    { style: { padding: '20px' } },
    React.createElement(
      'h1',
      null,
      `Vorthain vs useReducer Comparison (App Renders: ${renderCount})`
    ),
    React.createElement(
      'p',
      null,
      React.createElement('strong', null, 'Open the browser console to see render logs.'),
      ' Click buttons to see re-render behavior differences!'
    ),
    React.createElement(DrawersProvider, null, React.createElement(ReducerDrawers)),
    React.createElement(VorthainDrawers)
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}
