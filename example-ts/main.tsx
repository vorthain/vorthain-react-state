import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createVorthainStore, useVglobal, useVstate, vAction } from '../src/index';
import { RootStore } from './vstore/RootStore';

createVorthainStore(RootStore);

const useAppStore = (): RootStore => {
  return useVglobal();
};

// ===================== APP STATS COMPONENT =====================
const AppStatsDisplay = () => {
  const store = useAppStore();

  return (
    <div style={{ padding: '15px', border: '2px solid #4caf50', marginBottom: '20px' }}>
      <h3>📊 App Stats (RootStore Getter)</h3>
      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <p>
          <strong>User:</strong> {store.appStats.user}
        </p>
        <p>
          <strong>Total Todos:</strong> {store.appStats.totalTodos}
        </p>
        <p>
          <strong>Completed Todos:</strong> {store.appStats.completedTodos}
        </p>
        <p>
          <strong>App Active:</strong> {store.appStats.isActive ? '✅ Active' : '❌ Inactive'}
        </p>
        <p>
          <strong>Global Toggle:</strong> {store.isToggledExample ? 'ON' : 'OFF'}
        </p>
      </div>
      <button onClick={store.toggleExample}>Toggle App State</button>
      <div style={{ background: '#d4edda', padding: '8px', marginTop: '10px', fontSize: '14px' }}>
        <strong>Tests:</strong> Global toggle, cross-store computed properties
      </div>
    </div>
  );
};

// ===================== KEYWORD MANAGEMENT =====================
const KeywordManager = ({ todoIndex }: { todoIndex: number }) => {
  const store = useAppStore();
  const state = useVstate({
    newKeyword: '',
    isAdding: false
  });

  const todo = store.todoStore.todos[todoIndex];
  if (!todo) return <div>Todo not found</div>;

  const addKeyword = () => {
    if (state.newKeyword.trim()) {
      store.todoStore.addKeyword(todoIndex, state.newKeyword.trim());
      state.newKeyword = '';
      state.isAdding = false;
    }
  };

  return (
    <div style={{ background: '#fff3e0', padding: '10px', margin: '5px 0', borderRadius: '4px' }}>
      <h4>🏷️ Keywords for "{todo.name}"</h4>

      <div style={{ marginBottom: '10px' }}>
        {todo.nested.keywords.map((keyword, index) => (
          <span
            key={index}
            style={{
              background: '#e3f2fd',
              padding: '2px 8px',
              margin: '2px',
              borderRadius: '12px',
              fontSize: '12px',
              display: 'inline-block'
            }}>
            {keyword}
            <button
              onClick={() => store.todoStore.removeKeyword(todoIndex, index)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f44336',
                marginLeft: '5px',
                cursor: 'pointer'
              }}>
              ×
            </button>
          </span>
        ))}
        {todo.nested.keywords.length === 0 && (
          <span style={{ color: '#666', fontSize: '12px' }}>No keywords yet</span>
        )}
      </div>

      {state.isAdding ? (
        <div>
          <input
            value={state.newKeyword}
            onChange={(e) => (state.newKeyword = e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Enter keyword..."
            autoFocus
          />
          <button onClick={addKeyword}>Add</button>
          <button
            onClick={() => {
              state.isAdding = false;
              state.newKeyword = '';
            }}>
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => (state.isAdding = true)}>+ Add Keyword</button>
      )}
    </div>
  );
};

// ===================== NESTED DATA EXPLORER =====================
const NestedDataExplorer = () => {
  const store = useAppStore();

  return (
    <div style={{ padding: '15px', border: '2px solid #9c27b0', marginBottom: '20px' }}>
      <h3>🔍 Nested Data Explorer</h3>
      <p>
        <strong>What this tests:</strong> Deep nested object reactivity
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        {store.todoStore.todos.map((todo, index) => (
          <div key={index} style={{ border: '1px solid #ddd', padding: '10px', margin: '5px 0' }}>
            <h4>
              {todo.name} (Priority: {todo.priority})
            </h4>
            <p>Nested Number: {todo.nested.someNumber}</p>
            <button onClick={() => (todo.nested.someNumber = Math.floor(Math.random() * 100))}>
              Randomize Number
            </button>
            <KeywordManager todoIndex={index} />
          </div>
        ))}
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Tests:</strong> Deep nested reactivity, keyword arrays, nested object mutations
      </div>
    </div>
  );
};

// ===================== BATCH OPERATIONS WITH vAction =====================
const BatchOperationsDemo = () => {
  const store = useAppStore();
  const state = useVstate({
    lastBatchTime: 0,
    lastUnbatchedTime: 0,
    lastOperation: '',
    isRunning: false
  });

  const add10Todos = () => {
    state.isRunning = true;
    const start = performance.now();

    vAction(() => {
      for (let i = 0; i < 10; i++) {
        store.todoStore.addTodo(
          `Todo ${Date.now()}-${i}`,
          i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low'
        );
      }
    });

    const end = performance.now();
    console.log(`Added 10 todos in ${(end - start).toFixed(2)}ms with vAction`);
    state.isRunning = false;
  };

  const performBatchedMutations = (count) => {
    if (store.todoStore.todos.length === 0) {
      alert('Add some todos first!');
      return;
    }

    state.isRunning = true;
    const start = performance.now();

    vAction(() => {
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * store.todoStore.todos.length);
        const todo = store.todoStore.todos[randomIndex];

        if (todo) {
          const mutationType = i % 4;

          switch (mutationType) {
            case 0:
              todo.counter += Math.floor(Math.random() * 10);
              break;
            case 1:
              todo.name = `Batched-${i}`;
              break;
            case 2:
              todo.toggled = !todo.toggled;
              break;
            case 3:
              todo.nested.someNumber = Math.floor(Math.random() * 1000);
              break;
          }
        }
      }
    });

    const end = performance.now();
    state.lastBatchTime = end - start;
    state.lastOperation = `Batched ${count}`;
    state.isRunning = false;
  };

  const performUnbatchedMutations = async (count) => {
    if (store.todoStore.todos.length === 0) {
      alert('Add some todos first!');
      return;
    }

    state.isRunning = true;
    const start = performance.now();

    // Throttle mutations to prevent crashes - process in smaller chunks
    const chunkSize = 25;
    const totalChunks = Math.ceil(count / chunkSize);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const chunkStart = chunk * chunkSize;
      const chunkEnd = Math.min(chunkStart + chunkSize, count);

      for (let i = chunkStart; i < chunkEnd; i++) {
        const randomIndex = Math.floor(Math.random() * store.todoStore.todos.length);
        const todo = store.todoStore.todos[randomIndex];

        if (todo) {
          const mutationType = i % 4;

          switch (mutationType) {
            case 0:
              todo.counter += Math.floor(Math.random() * 10);
              break;
            case 1:
              todo.name = `Unbatched-${i}`;
              break;
            case 2:
              todo.toggled = !todo.toggled;
              break;
            case 3:
              todo.nested.someNumber = Math.floor(Math.random() * 1000);
              break;
          }
        }
      }

      // Give the browser time to breathe between chunks
      if (chunk < totalChunks - 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    const end = performance.now();
    state.lastUnbatchedTime = end - start;
    state.lastOperation = `Unbatched ${count}`;
    state.isRunning = false;
  };

  const clearAllTodos = () => {
    store.todoStore.todos.length = 0;
    state.lastBatchTime = 0;
    state.lastUnbatchedTime = 0;
    state.lastOperation = '';
  };

  return (
    <div style={{ padding: '15px', border: '2px solid #ff5722', marginBottom: '20px' }}>
      <h3>⚡ vAction Batch Operations Demo</h3>
      <p>
        <strong>What this tests:</strong> Performance difference between batched and unbatched
        mutations
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <p>
          <strong>Current Todos:</strong> {store.todoStore.todos.length}
        </p>
        <p>
          <strong>Completed:</strong> {store.todoStore.completedCount}
        </p>

        {state.lastBatchTime > 0 && state.lastOperation.includes('Batched') && (
          <div
            style={{ background: '#d4edda', padding: '8px', margin: '5px 0', borderRadius: '4px' }}>
            <strong>🚀 {state.lastOperation}:</strong> {state.lastBatchTime.toFixed(2)}ms
          </div>
        )}

        {state.lastUnbatchedTime > 0 && state.lastOperation.includes('Unbatched') && (
          <div
            style={{ background: '#f8d7da', padding: '8px', margin: '5px 0', borderRadius: '4px' }}>
            <strong>🐌 {state.lastOperation}:</strong> {state.lastUnbatchedTime.toFixed(2)}ms
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>Setup:</h4>
        <button
          onClick={add10Todos}
          disabled={state.isRunning}
          style={{ marginRight: '10px', padding: '8px 16px' }}>
          {state.isRunning ? 'Adding...' : '📋 Add 10 Todos'}
        </button>

        <button onClick={clearAllTodos} disabled={state.isRunning} style={{ padding: '8px 16px' }}>
          🗑️ Clear All ({store.todoStore.todos.length})
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>🚀 Batched Mutations (vAction):</h4>
        {[5, 20, 50, 100].map((count) => (
          <button
            key={count}
            onClick={() => performBatchedMutations(count)}
            disabled={state.isRunning || store.todoStore.todos.length === 0}
            style={{
              marginRight: '10px',
              marginBottom: '5px',
              padding: '6px 12px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '3px'
            }}>
            {state.isRunning ? 'Running...' : `${count} mutations`}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>🐌 Unbatched Mutations:</h4>
        {[5, 20, 50, 100].map((count) => (
          <button
            key={count}
            onClick={() => performUnbatchedMutations(count)}
            disabled={state.isRunning || store.todoStore.todos.length === 0}
            style={{
              marginRight: '10px',
              marginBottom: '5px',
              padding: '6px 12px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '3px'
            }}>
            {state.isRunning ? 'Running...' : `${count} mutations`}
          </button>
        ))}
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>How to test:</strong>
        <br />
        1. Click "Add 10 Todos" to create test data
        <br />
        2. Try batched mutations (green buttons) - should be fast
        <br />
        3. Try unbatched mutations (red buttons) - will be slower
        <br />
        4. Compare the timing results above
      </div>
    </div>
  );
};

// ===================== API DATA MANAGER =====================
const ApiDataManager = () => {
  const store = useAppStore();

  return (
    <div style={{ padding: '15px', border: '2px solid #00bcd4', marginBottom: '20px' }}>
      <h3>🌐 API Data Manager</h3>
      <p>
        <strong>What this tests:</strong> Async operations, loading states
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <p>Loading: {store.todoStore.isLoading ? '⏳ Yes' : '✅ No'}</p>

        {store.todoStore.apiData ? (
          <div style={{ background: '#e8f5e8', padding: '8px', marginTop: '10px' }}>
            <h4>📄 API Response:</h4>
            {store.todoStore.apiData.error ? (
              <p style={{ color: '#f44336' }}>Error: {store.todoStore.apiData.error}</p>
            ) : (
              <div>
                <p>
                  <strong>ID:</strong> {store.todoStore.apiData.id}
                </p>
                <p>
                  <strong>Title:</strong> {store.todoStore.apiData.title}
                </p>
                <p>
                  <strong>Body:</strong> {store.todoStore.apiData.body?.substring(0, 100)}...
                </p>
              </div>
            )}
          </div>
        ) : (
          <p>No API data loaded</p>
        )}
      </div>

      <button onClick={store.todoStore.fetchApiData} disabled={store.todoStore.isLoading}>
        {store.todoStore.isLoading ? 'Fetching...' : 'Fetch API Data'}
      </button>

      <div style={{ background: '#d4edda', padding: '8px', marginTop: '10px', fontSize: '14px' }}>
        <strong>Tests:</strong> Async state management, loading indicators, error handling
      </div>
    </div>
  );
};

// ===================== PRIORITY FILTER & ANALYTICS =====================
const PriorityAnalytics = () => {
  const store = useAppStore();
  const state = useVstate({
    selectedPriority: 'all' as 'all' | 'low' | 'medium' | 'high',

    get filteredTodos() {
      if (state.selectedPriority === 'all') {
        return store.todoStore.todos;
      }
      return store.todoStore.todos.filter((todo) => todo.priority === state.selectedPriority);
    },

    get priorityStats() {
      const stats = { low: 0, medium: 0, high: 0, total: 0 };
      store.todoStore.todos.forEach((todo) => {
        stats[todo.priority]++;
        stats.total++;
      });
      return stats;
    },

    get avgCounterValue() {
      const todos = state.filteredTodos;
      if (todos.length === 0) return 0;
      const total = todos.reduce((sum, todo) => sum + todo.counter, 0);
      return (total / todos.length).toFixed(2);
    }
  });

  return (
    <div style={{ padding: '15px', border: '2px solid #673ab7', marginBottom: '20px' }}>
      <h3>📈 Priority Analytics</h3>
      <p>
        <strong>What this tests:</strong> Complex getters, filtered data, computed analytics
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Filter by Priority: </label>
          <select
            value={state.selectedPriority}
            onChange={(e) => (state.selectedPriority = e.target.value as any)}>
            <option value="all">All ({state.priorityStats.total})</option>
            <option value="low">Low ({state.priorityStats.low})</option>
            <option value="medium">Medium ({state.priorityStats.medium})</option>
            <option value="high">High ({state.priorityStats.high})</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <h4>📊 Priority Distribution:</h4>
            <p>🔴 High: {state.priorityStats.high}</p>
            <p>🟡 Medium: {state.priorityStats.medium}</p>
            <p>🟢 Low: {state.priorityStats.low}</p>
          </div>

          <div>
            <h4>📋 Filtered Results:</h4>
            <p>Showing: {state.filteredTodos.length} todos</p>
            <p>Avg Counter: {state.avgCounterValue}</p>
            <p>Completed: {state.filteredTodos.filter((t) => t.toggled).length}</p>
          </div>
        </div>

        <div style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto' }}>
          {state.filteredTodos.map((todo, index) => (
            <div
              key={index}
              style={{
                padding: '5px',
                margin: '2px 0',
                background: todo.toggled ? '#e8f5e8' : '#fff3e0',
                borderRadius: '3px'
              }}>
              <span>{todo.name}</span>
              <span style={{ float: 'right' }}>
                {todo.priority} | Counter: {todo.counter}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Tests:</strong> Local getters with store dependencies, filtered computed values,
        real-time analytics
      </div>
    </div>
  );
};

// ===================== CROSS-BOUNDARY WATCHER COMPONENTS =====================
const LocalStateWithStoreGetter = () => {
  const store = useAppStore();
  const state = useVstate({
    prefix: '📋',
    get storeData() {
      return `${state.prefix} Store has ${store.todoStore.todos.length} todos, ${store.todoStore.completedCount} completed`;
    }
  });

  return (
    <div
      style={{
        padding: '10px',
        background: '#e3f2fd',
        border: '1px solid #2196f3',
        margin: '5px 0'
      }}>
      <strong>Local→Store Watcher:</strong> {state.storeData}
      <button onClick={() => (state.prefix = state.prefix === '📋' ? '🔥' : '📋')}>
        Change Prefix
      </button>
    </div>
  );
};

const StoreWithLocalDependency = () => {
  const store = useAppStore();
  const state = useVstate({
    multiplier: 2,
    get calculation() {
      return store.todoStore.todos.length * state.multiplier;
    }
  });

  return (
    <div
      style={{
        padding: '10px',
        background: '#f3e5f5',
        border: '1px solid #9c27b0',
        margin: '5px 0'
      }}>
      <strong>Mixed Calculation:</strong> {state.calculation} (todos × {state.multiplier})
      <button onClick={() => state.multiplier++}>+1 Multiplier</button>
    </div>
  );
};

// ===================== MAIN TESTS =====================
const Test1_StoreDisplay = () => {
  const store = useAppStore();

  return (
    <div style={{ padding: '15px', border: '2px solid #e74c3c', marginBottom: '20px' }}>
      <h3>TEST 1: Store Display + Actions</h3>
      <p>
        <strong>What this tests:</strong> Basic store reactivity
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <h4>Current Todos:</h4>
        {store.todoStore.todos.map((todo, index) => (
          <div
            key={index}
            style={{ margin: '5px 0', padding: '5px', background: 'white', borderRadius: '3px' }}>
            <strong>{todo.name}</strong> | Counter: {todo.counter} | Status:{' '}
            {todo.toggled ? 'DONE' : 'PENDING'} | Priority: {todo.priority}
            <div style={{ marginTop: '5px' }}>
              <button onClick={() => store.todoStore.incrementCounter(index)}>+1 Counter</button>
              <button onClick={() => store.todoStore.toggleTodo(index)}>Toggle Status</button>
              <button onClick={() => store.todoStore.removeTodo(index)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <button onClick={() => store.todoStore.addTodo('New Todo', 'medium')}>Add Todo</button>
        <button onClick={() => store.todoStore.addTodo('High Priority Task', 'high')}>
          Add High Priority
        </button>
      </div>
    </div>
  );
};

const Test2_StoreGetters = () => {
  const store = useAppStore();

  return (
    <div style={{ padding: '15px', border: '2px solid #28a745', marginBottom: '20px' }}>
      <h3>TEST 2: Store Getters</h3>
      <p>
        <strong>What this tests:</strong> Store getters update correctly
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <p>Total Todos: {store.todoStore.todos.length}</p>
        <p>Completed Count: {store.todoStore.completedCount}</p>
        <p>High Priority Count: {store.todoStore.highPriorityTodos.length}</p>
      </div>
    </div>
  );
};

const Test3_CrossBoundaryUpdates = () => {
  const store = useAppStore();

  return (
    <div style={{ padding: '15px', border: '3px solid #ff5722', marginBottom: '20px' }}>
      <h3>TEST 3: Cross-Boundary Updates</h3>
      <p>
        <strong>What this tests:</strong> Local getters with store dependencies
      </p>

      <div style={{ marginBottom: '15px' }}>
        <button onClick={() => store.todoStore.addTodo('Test Todo')}>Add Store Todo</button>
        <button
          onClick={() => {
            if (store.todoStore.todos.length > 0) {
              store.todoStore.todos[0].counter++;
            }
          }}>
          Increment First Counter
        </button>
        <button onClick={() => store.todoStore.removeTodo(0)}>Remove First</button>
      </div>

      <div style={{ background: '#fff3e0', padding: '10px' }}>
        <h4>👀 Watch These Update:</h4>
        <LocalStateWithStoreGetter />
        <StoreWithLocalDependency />
      </div>
    </div>
  );
};

// ===================== LARGE DATASET PAGINATION TEST =====================
const LargeDatasetPagination = () => {
  const state = useVstate({
    items: [] as Array<{ id: number; name: string }>,
    currentPage: 0,
    itemsPerPage: 5,
    isLoading: false,
    isFetching: false,
    editingId: null as number | null,
    editingName: '',

    get totalPages() {
      return Math.ceil(state.items.length / state.itemsPerPage);
    },

    get currentItems() {
      const start = state.currentPage * state.itemsPerPage;
      const end = start + state.itemsPerPage;
      return state.items.slice(start, end);
    },

    get hasNextPage() {
      return state.currentPage < state.totalPages - 1;
    },

    get hasPrevPage() {
      return state.currentPage > 0;
    },

    simulateFetch: async () => {
      state.isFetching = true;

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate 2000 items using vAction for optimal performance
      vAction(() => {
        state.items = Array.from({ length: 2000 }, (_, index) => ({
          id: index + 1,
          name: `Item ${index + 1} - ${Math.random().toString(36).substring(2, 8)}`
        }));
      });

      state.currentPage = 0;
      state.isFetching = false;
    },

    nextPage() {
      if (state.hasNextPage) {
        state.currentPage++;
      }
    },

    prevPage() {
      if (state.hasPrevPage) {
        state.currentPage--;
      }
    },

    goToPage(page: number) {
      if (page >= 0 && page < state.totalPages) {
        state.currentPage = page;
      }
    },

    startEditing(id: number, currentName: string) {
      state.editingId = id;
      state.editingName = currentName;
    },

    saveEdit() {
      if (state.editingId !== null && state.editingName.trim()) {
        const item = state.items.find((item) => item.id === state.editingId);
        if (item) {
          item.name = state.editingName.trim();
        }
      }
      state.editingId = null;
      state.editingName = '';
    },

    cancelEdit() {
      state.editingId = null;
      state.editingName = '';
    },

    clearData() {
      state.items.length = 0;
      state.currentPage = 0;
      state.editingId = null;
      state.editingName = '';
    }
  });

  return (
    <div style={{ padding: '15px', border: '2px solid #e91e63', marginBottom: '20px' }}>
      <h3>📊 Large Dataset Pagination Test</h3>
      <p>
        <strong>What this tests:</strong> 2000 items, pagination, deep reactivity on individual item
        edits
      </p>

      <div style={{ background: '#f8f9fa', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <p>
            <strong>Total Items:</strong> {state.items.length}
          </p>
          <p>
            <strong>Items Per Page:</strong> {state.itemsPerPage}
          </p>
          <p>
            <strong>Total Pages:</strong> {state.totalPages}
          </p>
          <p>
            <strong>Current Page:</strong> {state.currentPage + 1} of {state.totalPages}
          </p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={state.simulateFetch}
            disabled={state.isFetching}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}>
            {state.isFetching ? '🔄 Fetching 2000 items...' : '📡 Fetch 2000 Items'}
          </button>

          <button
            onClick={state.clearData}
            disabled={state.isFetching}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}>
            🗑️ Clear Data
          </button>
        </div>

        {state.items.length > 0 && (
          <>
            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                padding: '10px',
                background: '#e3f2fd',
                borderRadius: '4px'
              }}>
              <button
                onClick={state.prevPage}
                disabled={!state.hasPrevPage}
                style={{ padding: '5px 10px' }}>
                ← Prev
              </button>

              <span>
                Page {state.currentPage + 1} of {state.totalPages}
              </span>

              <button
                onClick={state.nextPage}
                disabled={!state.hasNextPage}
                style={{ padding: '5px 10px' }}>
                Next →
              </button>

              <span style={{ marginLeft: '20px' }}>Go to page:</span>
              <input
                type="number"
                min="1"
                max={state.totalPages}
                style={{ width: '60px', padding: '2px 5px' }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt((e.target as HTMLInputElement).value) - 1;
                    state.goToPage(page);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>

            {/* Current Page Items */}
            <div
              style={{
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
              {state.currentItems.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px',
                    borderBottom: index < state.currentItems.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                  <div style={{ flex: 1 }}>
                    <strong>ID: {item.id}</strong>
                    {state.editingId === item.id ? (
                      <div style={{ marginTop: '5px' }}>
                        <input
                          value={state.editingName}
                          onChange={(e) => (state.editingName = e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') state.saveEdit();
                            if (e.key === 'Escape') state.cancelEdit();
                          }}
                          style={{
                            padding: '5px',
                            marginRight: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                            minWidth: '200px'
                          }}
                          autoFocus
                        />
                        <button
                          onClick={state.saveEdit}
                          style={{
                            padding: '5px 10px',
                            marginRight: '5px',
                            background: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px'
                          }}>
                          Save
                        </button>
                        <button
                          onClick={state.cancelEdit}
                          style={{
                            padding: '5px 10px',
                            background: '#666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px'
                          }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '5px' }}>
                        <span style={{ color: '#666' }}>{item.name}</span>
                      </div>
                    )}
                  </div>

                  {state.editingId !== item.id && (
                    <button
                      onClick={() => state.startEditing(item.id, item.name)}
                      style={{
                        padding: '5px 10px',
                        background: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}>
                      ✏️ Edit
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Navigation */}
            <div
              style={{
                marginTop: '15px',
                padding: '10px',
                background: '#fff3e0',
                borderRadius: '4px'
              }}>
              <strong>Quick Navigation:</strong>
              <div style={{ marginTop: '5px' }}>
                <button
                  onClick={() => state.goToPage(0)}
                  style={{ margin: '2px', padding: '3px 8px' }}>
                  First
                </button>
                <button
                  onClick={() => state.goToPage(Math.floor(state.totalPages / 4))}
                  style={{ margin: '2px', padding: '3px 8px' }}>
                  25%
                </button>
                <button
                  onClick={() => state.goToPage(Math.floor(state.totalPages / 2))}
                  style={{ margin: '2px', padding: '3px 8px' }}>
                  50%
                </button>
                <button
                  onClick={() => state.goToPage(Math.floor((state.totalPages * 3) / 4))}
                  style={{ margin: '2px', padding: '3px 8px' }}>
                  75%
                </button>
                <button
                  onClick={() => state.goToPage(state.totalPages - 1)}
                  style={{ margin: '2px', padding: '3px 8px' }}>
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Tests:</strong>
        <br />• Large dataset creation (2000 items) with vAction batching
        <br />• Pagination with computed properties (currentItems, totalPages)
        <br />• Individual item editing with deep reactivity
        <br />• Navigation performance across large dataset
        <br />• Memory efficiency with only 5 items rendered at a time
      </div>
    </div>
  );
};

// ===================== EDGE CASE 1: DEEPLY NESTED CROSS-BOUNDARY GETTER =====================
const DeepCrossBoundaryGetter = () => {
  const store = useAppStore();
  const state = useVstate({
    prefix: '🔗',
    multiplier: 2,

    // Getter that depends on deeply nested store data
    get nestedTodoSummary() {
      return (
        state.prefix +
        ' ' +
        store.todoStore.todos
          .map((todo) => `${todo.name}[${todo.nested.keywords.join(',')}]`)
          .join(' | ') +
        ` (×${state.multiplier})`
      );
    },

    // Getter that calculates from nested numbers
    get nestedNumbersSum() {
      const sum = store.todoStore.todos.reduce((acc, todo) => acc + todo.nested.someNumber, 0);
      return sum * state.multiplier;
    },

    // Super complex getter mixing local and store state
    get complexCalculation() {
      const completedKeywords = store.todoStore.todos
        .filter((todo) => todo.toggled)
        .flatMap((todo) => todo.nested.keywords)
        .filter((keyword, index, arr) => arr.indexOf(keyword) === index); // unique

      return `${state.prefix} Completed todos have ${
        completedKeywords.length
      } unique keywords: [${completedKeywords.join(', ')}] × ${state.multiplier} = ${
        completedKeywords.length * state.multiplier
      }`;
    }
  });

  return (
    <div style={{ padding: '15px', border: '3px solid #ff9800', marginBottom: '20px' }}>
      <h3>🔗 Deep Cross-Boundary Getters</h3>
      <p>
        <strong>What this tests:</strong> Local getters accessing deeply nested store data
      </p>

      <div style={{ background: '#fff3e0', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Prefix:</strong> {state.prefix}
          <button onClick={() => (state.prefix = state.prefix === '🔗' ? '⚡' : '🔗')}>
            Change Prefix
          </button>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Multiplier:</strong> {state.multiplier}
          <button onClick={() => state.multiplier++}>+1</button>
          <button onClick={() => (state.multiplier = Math.max(1, state.multiplier - 1))}>-1</button>
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Nested Summary:</strong>
          <br />
          {state.nestedTodoSummary}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Nested Numbers Sum:</strong> {state.nestedNumbersSum}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Complex Calculation:</strong>
          <br />
          {state.complexCalculation}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Quick Test Actions:</strong>
        <br />
        <button onClick={() => store.todoStore.addTodo('Test Deep Reactivity', 'high')}>
          Add Todo (Should Update All Getters)
        </button>
        <button
          onClick={() => {
            if (store.todoStore.todos.length > 0) {
              store.todoStore.todos[0].nested.keywords.push(`keyword-${Date.now()}`);
            }
          }}>
          Add Keyword to First Todo
        </button>
        <button
          onClick={() => {
            if (store.todoStore.todos.length > 0) {
              store.todoStore.todos[0].nested.someNumber = Math.floor(Math.random() * 1000);
            }
          }}>
          Randomize First Todo Number
        </button>
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Edge case:</strong> Local getters deeply accessing nested store arrays and doing
        complex transformations
      </div>
    </div>
  );
};

// ===================== EDGE CASE 2: CIRCULAR DEPENDENCIES =====================
const CircularDependencyTest = () => {
  const store = useAppStore();
  const state = useVstate({
    localCounter: 1,

    // This getter depends on store data
    get storeBasedValue() {
      return store.todoStore.todos.length + state.localCounter;
    },

    // This getter creates a potential circular dependency
    get circularValue() {
      // Access store data that might trigger this component to re-render
      const todoCount = store.todoStore.todos.length;
      // Then access our own getter that also depends on store
      const storeValue = state.storeBasedValue;
      // And do some calculation
      return todoCount * state.localCounter + storeValue;
    },

    // Super nested circular dependency
    get megaComplexValue() {
      const base = state.circularValue;
      const keywords = store.todoStore.todos.flatMap((t) => t.nested.keywords);
      const counters = store.todoStore.todos.map((t) => t.counter);

      return `Base: ${base}, Keywords: ${keywords.length}, Counters: ${counters.join(
        '+'
      )}, Local: ${state.localCounter}`;
    }
  });

  return (
    <div style={{ padding: '15px', border: '3px solid #e91e63', marginBottom: '20px' }}>
      <h3>🌀 Circular Dependency Test</h3>
      <p>
        <strong>What this tests:</strong> Complex interdependent getters that could cause infinite
        loops
      </p>

      <div style={{ background: '#fce4ec', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Local Counter:</strong> {state.localCounter}
          <button onClick={() => state.localCounter++}>+1</button>
          <button onClick={() => (state.localCounter = Math.max(0, state.localCounter - 1))}>
            -1
          </button>
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Store Based Value:</strong> {state.storeBasedValue}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Circular Value:</strong> {state.circularValue}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '11px' }}>
          <strong>Mega Complex:</strong>
          <br />
          {state.megaComplexValue}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Test Actions:</strong>
        <br />
        <button
          onClick={() => {
            // Rapid fire changes to test circular dependencies
            vAction(() => {
              state.localCounter += 5;
              store.todoStore.addTodo('Circular Test');
              state.localCounter -= 2;
              if (store.todoStore.todos.length > 0) {
                store.todoStore.todos[0].counter += 10;
              }
            });
          }}>
          Rapid Fire Changes (vAction)
        </button>
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Edge case:</strong> Getters that depend on other getters that depend on store data
        that could trigger re-renders
      </div>
    </div>
  );
};

// ===================== EDGE CASE 3: DYNAMIC PROPERTY ACCESS =====================
const DynamicPropertyAccess = () => {
  const store = useAppStore();
  const state = useVstate({
    selectedTodoIndex: 0,
    selectedProperty: 'name' as 'name' | 'counter' | 'priority',
    computedPath: 'nested.someNumber',

    get dynamicTodoValue() {
      const todo = store.todoStore.todos[state.selectedTodoIndex];
      if (!todo) return 'No todo at index';

      // Dynamic property access - should still trigger reactivity
      return `${state.selectedProperty}: ${todo[state.selectedProperty]}`;
    },

    get deepDynamicValue() {
      const todo = store.todoStore.todos[state.selectedTodoIndex];
      if (!todo) return 'No todo';

      // Super dynamic deep access
      const path = state.computedPath.split('.');
      let value: any = todo;
      for (const key of path) {
        value = value?.[key];
      }

      return `${state.computedPath} = ${JSON.stringify(value)}`;
    },

    get allTodosProperty() {
      // Access the same property on all todos
      return store.todoStore.todos
        .map((todo, index) => `Todo ${index}: ${todo[state.selectedProperty]}`)
        .join(' | ');
    },

    // REALLY CRAZY: Access properties by computing their names
    get computedPropertyAccess() {
      const propName = state.selectedProperty === 'name' ? 'counter' : 'name';
      const todos = store.todoStore.todos;

      return todos
        .map((todo, i) => {
          const primary = todo[state.selectedProperty];
          const secondary = todo[propName];
          return `${i}:(${primary}/${secondary})`;
        })
        .join(' ');
    }
  });

  return (
    <div style={{ padding: '15px', border: '3px solid #9c27b0', marginBottom: '20px' }}>
      <h3>🎯 Dynamic Property Access</h3>
      <p>
        <strong>What this tests:</strong> Dynamic property access, computed paths, reactive bracket
        notation
      </p>

      <div style={{ background: '#f3e5f5', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Selected Todo Index: </label>
          <select
            value={state.selectedTodoIndex}
            onChange={(e) => (state.selectedTodoIndex = parseInt(e.target.value))}>
            {store.todoStore.todos.map((_, index) => (
              <option key={index} value={index}>
                Todo {index}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Selected Property: </label>
          <select
            value={state.selectedProperty}
            onChange={(e) => (state.selectedProperty = e.target.value as any)}>
            <option value="name">name</option>
            <option value="counter">counter</option>
            <option value="priority">priority</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Computed Path: </label>
          <input
            value={state.computedPath}
            onChange={(e) => (state.computedPath = e.target.value)}
            placeholder="e.g., nested.someNumber"
          />
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Dynamic Todo Value:</strong> {state.dynamicTodoValue}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Deep Dynamic Value:</strong> {state.deepDynamicValue}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '11px' }}>
          <strong>All Todos Property:</strong>
          <br />
          {state.allTodosProperty}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '11px' }}>
          <strong>Computed Property Access:</strong>
          <br />
          {state.computedPropertyAccess}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Test Actions:</strong>
        <br />
        <button
          onClick={() => {
            const todo = store.todoStore.todos[state.selectedTodoIndex];
            if (todo)
              todo[state.selectedProperty] =
                state.selectedProperty === 'counter'
                  ? (todo.counter as number) + 1
                  : `Modified-${Date.now()}`;
          }}>
          Modify Selected Property
        </button>
        <button
          onClick={() => {
            const todo = store.todoStore.todos[state.selectedTodoIndex];
            if (todo) todo.nested.someNumber = Math.floor(Math.random() * 1000);
          }}>
          Modify Nested Number
        </button>
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Edge case:</strong> Dynamic property access using variables, computed paths, and
        bracket notation
      </div>
    </div>
  );
};

// ===================== EDGE CASE 4: ASYNC GETTER DEPENDENCIES =====================
const AsyncGetterDependencies = () => {
  const store = useAppStore();
  const state = useVstate({
    asyncData: null as any,
    isLoading: false,
    refreshInterval: 3000,
    lastRefresh: 0,

    async loadAsyncData() {
      state.isLoading = true;

      // Simulate async operation that depends on current store state
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const todoCount = store.todoStore.todos.length;
      const completedCount = store.todoStore.completedCount;

      state.asyncData = {
        timestamp: Date.now(),
        todoSnapshot: todoCount,
        completedSnapshot: completedCount,
        ratio: todoCount > 0 ? ((completedCount / todoCount) * 100).toFixed(1) : '0',
        randomValue: Math.floor(Math.random() * 1000)
      };

      state.lastRefresh = Date.now();
      state.isLoading = false;
    },

    // Getter that depends on both async data and live store data
    get asyncComparison() {
      if (!state.asyncData) return 'No async data loaded';

      const currentTodos = store.todoStore.todos.length;
      const currentCompleted = store.todoStore.completedCount;
      const snapshotTodos = state.asyncData.todoSnapshot;
      const snapshotCompleted = state.asyncData.completedSnapshot;

      const todosDiff = currentTodos - snapshotTodos;
      const completedDiff = currentCompleted - snapshotCompleted;

      return `Since snapshot: Todos ${todosDiff >= 0 ? '+' : ''}${todosDiff}, Completed ${
        completedDiff >= 0 ? '+' : ''
      }${completedDiff}`;
    },

    get shouldRefresh() {
      if (!state.lastRefresh) return true;
      return Date.now() - state.lastRefresh > state.refreshInterval;
    },

    // Complex getter that mixes everything
    get complexAsyncState() {
      const timeSinceRefresh = state.lastRefresh ? Date.now() - state.lastRefresh : 0;
      const currentTodoNames = store.todoStore.todos.map((t) => t.name).join(', ');

      return {
        shouldRefresh: state.shouldRefresh,
        timeSinceRefresh: Math.floor(timeSinceRefresh / 1000),
        comparison: state.asyncComparison,
        currentTodoNames,
        isStale: timeSinceRefresh > state.refreshInterval
      };
    }
  });

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.shouldRefresh && !state.isLoading) {
        state.loadAsyncData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '15px', border: '3px solid #00bcd4', marginBottom: '20px' }}>
      <h3>⏱️ Async Getter Dependencies</h3>
      <p>
        <strong>What this tests:</strong> Getters that depend on both async data and live store
        state
      </p>

      <div style={{ background: '#e0f2f1', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Refresh Interval:</strong> {state.refreshInterval}ms
          <button
            onClick={() => (state.refreshInterval = Math.max(1000, state.refreshInterval - 1000))}>
            -1s
          </button>
          <button onClick={() => (state.refreshInterval += 1000)}>+1s</button>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Status:</strong> {state.isLoading ? '🔄 Loading...' : '✅ Ready'}
          <button
            onClick={state.loadAsyncData}
            disabled={state.isLoading}
            style={{ marginLeft: '10px' }}>
            Force Refresh
          </button>
        </div>

        {state.asyncData && (
          <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
            <strong>Async Snapshot:</strong>
            <br />
            Timestamp: {new Date(state.asyncData.timestamp).toLocaleTimeString()}
            <br />
            Todos: {state.asyncData.todoSnapshot}, Completed: {state.asyncData.completedSnapshot}
            <br />
            Ratio: {state.asyncData.ratio}%, Random: {state.asyncData.randomValue}
          </div>
        )}

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '12px' }}>
          <strong>Live Comparison:</strong> {state.asyncComparison}
        </div>

        <div style={{ background: '#f5f5f5', padding: '8px', margin: '5px 0', fontSize: '11px' }}>
          <strong>Complex State:</strong>
          <br />
          Should Refresh: {state.complexAsyncState.shouldRefresh ? 'Yes' : 'No'}
          <br />
          Time Since: {state.complexAsyncState.timeSinceRefresh}s<br />
          Is Stale: {state.complexAsyncState.isStale ? 'Yes' : 'No'}
          <br />
          Current Todos: {state.complexAsyncState.currentTodoNames || 'None'}
          <br />
          Comparison: {state.complexAsyncState.comparison}
        </div>
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Edge case:</strong> Async operations creating snapshots, then getters comparing
        snapshots to live data
      </div>
    </div>
  );
};

// ===================== EDGE CASE 5: GETTER CHAIN REACTIONS =====================
const GetterChainReactions = () => {
  const store = useAppStore();
  const state = useVstate({
    factor: 2,

    // Level 1: Basic store dependency
    get level1() {
      return store.todoStore.todos.length * state.factor;
    },

    // Level 2: Depends on level1 getter
    get level2() {
      return state.level1 + store.todoStore.completedCount;
    },

    // Level 3: Depends on level2 AND has its own store access
    get level3() {
      const keywords = store.todoStore.todos.flatMap((t) => t.nested.keywords);
      return state.level2 * keywords.length;
    },

    // Level 4: Depends on level3 AND does complex calculations
    get level4() {
      const avg =
        store.todoStore.todos.length > 0
          ? store.todoStore.todos.reduce((sum, t) => sum + t.nested.someNumber, 0) /
            store.todoStore.todos.length
          : 0;

      return state.level3 + Math.floor(avg);
    },

    // Level 5: MEGA getter that depends on everything
    get level5_mega() {
      const priorities = store.todoStore.todos.reduce((acc, todo) => {
        acc[todo.priority] = (acc[todo.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityScore =
        (priorities.high || 0) * 3 + (priorities.medium || 0) * 2 + (priorities.low || 0) * 1;

      return {
        level1: state.level1,
        level2: state.level2,
        level3: state.level3,
        level4: state.level4,
        priorityScore,
        totalCalculation: state.level4 + priorityScore,
        chainDepth: 5,
        factor: state.factor
      };
    },

    // Circular reference test - getter that modifies state it depends on
    get dangerousGetter() {
      // This is intentionally dangerous to test the system's robustness
      const result = state.factor * 10;

      // Uncomment this to test infinite loop protection:
      // if (result > 100 && state.factor < 20) {
      //   state.factor++; // This would cause infinite updates!
      // }

      return result;
    }
  });

  return (
    <div style={{ padding: '15px', border: '3px solid #ff5722', marginBottom: '20px' }}>
      <h3>⛓️ Getter Chain Reactions</h3>
      <p>
        <strong>What this tests:</strong> Getters depending on other getters in complex chains
      </p>

      <div style={{ background: '#fff3e0', padding: '10px', marginBottom: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Factor:</strong> {state.factor}
          <button onClick={() => state.factor++}>+1</button>
          <button onClick={() => (state.factor = Math.max(1, state.factor - 1))}>-1</button>
          <button onClick={() => (state.factor = Math.floor(Math.random() * 10) + 1)}>
            Random
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div
              style={{ background: '#f5f5f5', padding: '6px', margin: '3px 0', fontSize: '11px' }}>
              <strong>Level 1:</strong> {state.level1}
            </div>
            <div
              style={{ background: '#f5f5f5', padding: '6px', margin: '3px 0', fontSize: '11px' }}>
              <strong>Level 2:</strong> {state.level2}
            </div>
            <div
              style={{ background: '#f5f5f5', padding: '6px', margin: '3px 0', fontSize: '11px' }}>
              <strong>Level 3:</strong> {state.level3}
            </div>
          </div>

          <div>
            <div
              style={{ background: '#f5f5f5', padding: '6px', margin: '3px 0', fontSize: '11px' }}>
              <strong>Level 4:</strong> {state.level4}
            </div>
            <div
              style={{ background: '#f5f5f5', padding: '6px', margin: '3px 0', fontSize: '11px' }}>
              <strong>Dangerous:</strong> {state.dangerousGetter}
            </div>
          </div>
        </div>

        <div style={{ background: '#e8f5e8', padding: '8px', margin: '10px 0', fontSize: '10px' }}>
          <strong>MEGA Level 5:</strong>
          <br />
          {JSON.stringify(state.level5_mega, null, 2)}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Chain Reaction Tests:</strong>
        <br />
        <button onClick={() => store.todoStore.addTodo('Chain Test', 'high')}>
          Add Todo (Should Update All Levels)
        </button>
        <button
          onClick={() => {
            if (store.todoStore.todos.length > 0) {
              store.todoStore.todos[0].nested.keywords.push(`chain-${Date.now()}`);
            }
          }}>
          Add Keyword (Affects Level 3+)
        </button>
        <button
          onClick={() => {
            vAction(() => {
              state.factor = Math.floor(Math.random() * 5) + 1;
              store.todoStore.addTodo('Batch Test');
              if (store.todoStore.todos.length > 0) {
                store.todoStore.todos[0].nested.someNumber = Math.floor(Math.random() * 100);
              }
            });
          }}>
          Batch Chain Reaction
        </button>
      </div>

      <div style={{ background: '#d4edda', padding: '8px', fontSize: '14px' }}>
        <strong>Edge case:</strong> Deep getter dependency chains where changing one value cascades
        through 5+ levels
      </div>
    </div>
  );
};

const App = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>🚀 Vorthain Comprehensive Test Suite</h1>
        <p>
          Testing all features: stores, getters, nested data, batching, async ops, and
          cross-boundary reactivity
        </p>
      </header>

      <LargeDatasetPagination />
      <AppStatsDisplay />
      <BatchOperationsDemo />
      <PriorityAnalytics />
      <NestedDataExplorer />
      <ApiDataManager />
      <Test3_CrossBoundaryUpdates />
      <Test1_StoreDisplay />
      <Test2_StoreGetters />
      <DeepCrossBoundaryGetter />
      <CircularDependencyTest />
      <DynamicPropertyAccess />
      <AsyncGetterDependencies />
      <GetterChainReactions />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
