import React, { createContext, useContext, useReducer, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createVorthainStore, useVglobal, useVstate, vGrip } from '../src/index.ts';

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
  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return <DrawersContext.Provider value={value}>{children}</DrawersContext.Provider>;
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

  return (
    <div
      style={{
        border: '1px solid #ccc',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#f0f8ff'
      }}>
      <div>
        Page {page.id} (Renders: {renderCount})
      </div>
      <div>Title: {page.title}</div>
      <div>Content: {page.content}</div>
      <button
        onClick={() => {
          dispatch({
            type: 'UPDATE_PAGE_TITLE',
            pageId: page.id,
            newTitle: page.title + ' - Edited'
          });
        }}>
        Change page title (Reducer)
      </button>
    </div>
  );
});

const ReducerFolder = React.memo(({ folder }) => {
  const renderCount = useRenderCounter(`ReducerFolder-${folder.id}`);

  return (
    <div
      style={{
        border: '1px solid #999',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#f5f5f5'
      }}>
      <div>
        Folder {folder.id} (Renders: {renderCount})
      </div>
      {folder.pages.map((page) => (
        <ReducerPage key={page.id} page={page} />
      ))}
    </div>
  );
});

const ReducerDrawer = React.memo(({ drawer }) => {
  const renderCount = useRenderCounter(`ReducerDrawer-${drawer.id}`);

  return (
    <div
      style={{
        border: '1px solid #666',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fafafa'
      }}>
      <div>
        Drawer {drawer.id} (Renders: {renderCount})
      </div>
      {drawer.folders.map((folder) => (
        <ReducerFolder key={folder.id} folder={folder} />
      ))}
    </div>
  );
});

const ReducerDrawers = () => {
  const renderCount = useRenderCounter('ReducerDrawers');
  const { state } = useDrawersContext();

  return (
    <div
      style={{
        border: '2px solid #333',
        margin: '10px',
        padding: '15px',
        backgroundColor: '#e6f3ff'
      }}>
      <h3>React useReducer Implementation (Renders: {renderCount})</h3>
      {state.drawers.map((drawer) => (
        <ReducerDrawer key={drawer.id} drawer={drawer} />
      ))}
    </div>
  );
};

// ============ VORTHAIN IMPLEMENTATION ============

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

// Optimized Vorthain Page Component with vGrip
const VorthainPage = vGrip(({ page }) => {
  const renderCount = useRenderCounter(`VorthainPage-${page.id}`);

  return (
    <div
      style={{
        border: '1px solid #ccc',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fff0f5'
      }}>
      <div>
        Page {page.id} (Renders: {renderCount}) - ⚡ Optimized with vGrip
      </div>
      <div>Title: {page.title}</div>
      <div>Content: {page.content}</div>
      <button
        onClick={() => {
          page.title = page.title + ' - Edited';
        }}>
        Change page title (Vorthain)
      </button>
    </div>
  );
});

const VorthainPageFirstComplexCase = vGrip(({ firstPage }) => {
  const renderCount = useRenderCounter(`VorthainPageFirstComplexCase-${firstPage.id}`);
  const store = useVorthainDrawerStore();
  const state1 = useVstate({
    get firstPageNameFromStoreInState1Getter() {
      return store.drawers[0].folders[0].pages[0].title + '-store-state1';
    }
  });
  const state2 = useVstate({
    get firstPageNameFromState1InState2Getter() {
      return state1.firstPageNameFromStoreInState1Getter + '|from state2|';
    }
  });
  const state3 = useVstate({
    get complexName() {
      return state2.firstPageNameFromState1InState2Getter + '-actual-page-name=' + firstPage.title;
    }
  });

  return (
    <div
      style={{
        border: '2px solid #858585',
        margin: '1px',
        padding: '12px',
        backgroundColor: '#dbc1ca'
      }}>
      <div>
        VorthainPageFirstComplexCase {firstPage.id} (Renders: {renderCount}) - ⚡ Optimized with
        vGrip
      </div>
      <div>Complex case: {state3.complexName}</div>
      <div>Should rerender just once on page title change</div>
    </div>
  );
});

// Local State Test Component with vGrip
const LocalStateTest = vGrip(() => {
  const renderCount = useRenderCounter('LocalStateTest');

  // Local observable state with useVstate
  const state = useVstate({
    counter: 0,
    message: 'Hello Vorthain!',
    items: ['apple', 'banana', 'cherry'],

    // Computed getter that depends on local state
    get computedInfo() {
      return `Counter: ${state.counter}, Items: ${state.items.length}, Message: "${state.message}"`;
    },

    incrementCounter() {
      state.counter += 1;
    },

    updateMessage() {
      state.message = `Updated at ${new Date().toLocaleTimeString()}`;
    },

    addItem() {
      state.items.push(`item-${Date.now()}`);
    }
  });

  return (
    <div
      style={{
        border: '2px solid #4CAF50',
        margin: '10px',
        padding: '15px',
        backgroundColor: '#f0fff0'
      }}>
      <h4>⚡ Local State Test (vGrip + useVstate) - Renders: {renderCount}</h4>
      <div>
        <strong>Computed Info:</strong> {state.computedInfo}
      </div>
      <div style={{ marginTop: '10px' }}>
        <button onClick={state.incrementCounter} style={{ margin: '5px' }}>
          Increment Counter ({state.counter})
        </button>
        <button onClick={state.updateMessage} style={{ margin: '5px' }}>
          Update Message
        </button>
        <button onClick={state.addItem} style={{ margin: '5px' }}>
          Add Item
        </button>
      </div>
      <div style={{ marginTop: '10px' }}>
        <strong>Items:</strong> {state.items.join(', ')}
      </div>
    </div>
  );
});

// Drawer Summary Component with computed getter
const DrawerSummary = vGrip(({ drawer }) => {
  const renderCount = useRenderCounter(`DrawerSummary-${drawer.id}`);

  // Local state for this component
  const state = useVstate({
    showDetails: false,
    lastUpdated: new Date().toLocaleTimeString(),

    // Computed getter that returns all page names from the drawer
    get allPageNames() {
      return drawer.folders
        .flatMap((folder) => folder.pages)
        .map((page) => page.title)
        .join(', ');
    },

    // Computed getter for page count
    get pageCount() {
      return drawer.folders.reduce((total, folder) => total + folder.pages.length, 0);
    },

    toggleDetails() {
      state.showDetails = !state.showDetails;
      state.lastUpdated = new Date().toLocaleTimeString();
    }
  });

  return (
    <div
      style={{
        border: '2px solid #FF9800',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fff8e1'
      }}>
      <h5>
        ⚡ Drawer Summary {drawer.id} (vGrip) - Renders: {renderCount}
      </h5>
      <div>
        <strong>Total Pages:</strong> {state.pageCount}
      </div>
      <div>
        <strong>All Page Names:</strong> {state.allPageNames}
      </div>
      <div style={{ marginTop: '10px' }}>
        <button onClick={state.toggleDetails}>{state.showDetails ? 'Hide' : 'Show'} Details</button>
        <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}>
          Last updated: {state.lastUpdated}
        </span>
      </div>
      {state.showDetails && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5' }}>
          <strong>Detailed Info:</strong>
          <ul>
            {drawer.folders.map((folder) => (
              <li key={folder.id}>
                Folder {folder.id}: {folder.pages.length} page(s)
                <ul>
                  {folder.pages.map((page) => (
                    <li key={page.id}>{page.title}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

// Regular Vorthain Folder Component (not optimized)
const VorthainFolder = ({ folder }) => {
  const renderCount = useRenderCounter(`VorthainFolder-${folder.id}`);

  return (
    <div
      style={{
        border: '1px solid #999',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#f5f5f5'
      }}>
      <div>
        Folder {folder.id} (Renders: {renderCount}) - Regular Component
      </div>
      {folder.pages.map((page) => (
        <VorthainPage key={page.id} page={page} />
      ))}
      <VorthainPageFirstComplexCase firstPage={folder.pages[0]} />
    </div>
  );
};

// Regular Vorthain Drawer Component (not optimized)
const VorthainDrawer = ({ drawer }) => {
  const renderCount = useRenderCounter(`VorthainDrawer-${drawer.id}`);

  return (
    <div
      style={{
        border: '1px solid #666',
        margin: '5px',
        padding: '10px',
        backgroundColor: '#fafafa'
      }}>
      <div>
        Drawer {drawer.id} (Renders: {renderCount}) - Regular Component
      </div>

      {/* Add the optimized summary component */}
      <DrawerSummary drawer={drawer} />

      {drawer.folders.map((folder) => (
        <VorthainFolder key={folder.id} folder={folder} />
      ))}
    </div>
  );
};

const VorthainDrawers = () => {
  const renderCount = useRenderCounter('VorthainDrawers');
  const store = useVorthainDrawerStore();

  return (
    <div
      style={{
        border: '2px solid #333',
        margin: '10px',
        padding: '15px',
        backgroundColor: '#ffe6f0'
      }}>
      <h3>⚡ Vorthain Implementation (Renders: {renderCount})</h3>

      {/* Add the local state test component */}
      <LocalStateTest />

      {store.drawers.map((drawer) => (
        <VorthainDrawer key={drawer.id} drawer={drawer} />
      ))}
    </div>
  );
};

// ============ MAIN APP ============

const App = () => {
  const renderCount = useRenderCounter('App');

  return (
    <div style={{ padding: '20px' }}>
      <h1>⚡ Vorthain vs useReducer Comparison (App Renders: {renderCount})</h1>
      <div
        style={{
          backgroundColor: '#f0f0f0',
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '5px'
        }}>
        <p>
          <strong>🔍 Open the browser console to see render logs.</strong>
        </p>
        <p>
          <strong>🧪 Test Features:</strong>
        </p>
        <ul>
          <li>
            <strong>vGrip optimization:</strong> Pages marked with ⚡ only re-render when their
            specific data changes
          </li>
          <li>
            <strong>useVstate local state:</strong> Test component with local observable state and
            computed getters
          </li>
          <li>
            <strong>Computed properties:</strong> Drawer summaries with computed page names and
            counts
          </li>
          <li>
            <strong>Surgical updates:</strong> Click buttons to see precise re-render behavior
          </li>
        </ul>
        <p>
          <strong>💡 Expected behavior:</strong> In Vorthain, only components that use changed data
          will re-render. In React useReducer, the entire tree re-renders even with React.memo.
        </p>
      </div>

      <DrawersProvider>
        <ReducerDrawers />
      </DrawersProvider>

      <VorthainDrawers />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  // Clear any existing content to avoid root conflicts during hot reload
  container.innerHTML = '';
  const root = createRoot(container);
  root.render(
    // <React.StrictMode>
    <App />
    // </React.StrictMode>
  );
}
