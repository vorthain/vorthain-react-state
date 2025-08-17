import React from 'react';
import { createVorthainStore, useVglobal, useVstate, vAction, vGrip } from '../../src/index.ts';
import './App.css';

const nextId = (() => {
  let id = 1000;
  return () => ++id;
})();

// ============= STORE SETUP =============
class RootStore {
  constructor() {
    this.counter = 0;
    this.user = {
      name: 'John',
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          sms: true
        },
        privacy: {
          shareData: false,
          analytics: true
        }
      },
      profile: {
        age: 25,
        country: 'USA',
        preferences: ['coding', 'gaming']
      }
    };
    this.todos = [
      {
        id: 1,
        text: 'Learn Vorthain',
        done: false,
        priority: 1,
        tags: ['learning', 'react'],
        metadata: { created: Date.now(), updated: Date.now() }
      },
      {
        id: 2,
        text: 'Build app',
        done: true,
        priority: 2,
        tags: ['development'],
        metadata: { created: Date.now(), updated: Date.now() }
      }
    ];
    this.cache = new Map();
    this.tags = new Set(['react', 'state']);
    this.metadata = {
      lastSync: Date.now(),
      syncCount: 0,
      errors: []
    };
    this.filters = {
      showCompleted: true,
      searchTerm: '',
      priority: 'all'
    };
    this.matrix = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ];
  }

  incrementCounter = () => {
    this.counter++;
  };

  toggleTheme = () => {
    this.user.settings.theme = this.user.settings.theme === 'dark' ? 'light' : 'dark';
  };

  toggleEmailNotifications = () => {
    this.user.settings.notifications.email = !this.user.settings.notifications.email;
  };

  addTodo = (text) => {
    this.todos.push({
      id: nextId(),
      text,
      done: false,
      priority: 1,
      tags: [],
      metadata: {
        created: Date.now(),
        updated: Date.now()
      }
    });
  };

  toggleTodo = (id) => {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.done = !todo.done;
      todo.metadata.updated = Date.now();
    }
  };

  updateTodoPriority = (id, priority) => {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.priority = priority;
      todo.metadata.updated = Date.now();
    }
  };

  addTodoTag = (id, tag) => {
    const todo = this.todos.find((t) => t.id === id);
    if (todo && !todo.tags.includes(tag)) {
      todo.tags.push(tag);
      this.tags.add(tag);
    }
  };

  removeTodoTag = (id, tag) => {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      const index = todo.tags.indexOf(tag);
      if (index > -1) {
        todo.tags.splice(index, 1);
      }
    }
  };

  updateFilter = (key, value) => {
    this.filters[key] = value;
  };

  updateMatrixCell = (row, col, value) => {
    this.matrix[row][col] = value;
  };

  syncMetadata = () => {
    this.metadata.lastSync = Date.now();
    this.metadata.syncCount++;
  };

  // Bulk operations for performance testing
  bulkUpdateTodos = (updates) => {
    updates.forEach(({ id, changes }) => {
      const todo = this.todos.find((t) => t.id === id);
      if (todo) {
        Object.assign(todo, changes);
        todo.metadata.updated = Date.now();
      }
    });
  };

  bulkToggleTodos = (ids) => {
    ids.forEach((id) => {
      const todo = this.todos.find((t) => t.id === id);
      if (todo) {
        todo.done = !todo.done;
        todo.metadata.updated = Date.now();
      }
    });
  };

  bulkUpdatePriorities = (updates) => {
    updates.forEach(({ id, priority }) => {
      const todo = this.todos.find((t) => t.id === id);
      if (todo) {
        todo.priority = priority;
        todo.metadata.updated = Date.now();
      }
    });
  };

  bulkAddTags = (updates) => {
    updates.forEach(({ id, tags }) => {
      const todo = this.todos.find((t) => t.id === id);
      if (todo) {
        tags.forEach((tag) => {
          if (!todo.tags.includes(tag)) {
            todo.tags.push(tag);
            this.tags.add(tag);
          }
        });
        todo.metadata.updated = Date.now();
      }
    });
  };

  get completedCount() {
    return this.todos.filter((t) => t.done).length;
  }

  get pendingTodos() {
    return this.todos.filter((t) => !t.done);
  }

  get filteredTodos() {
    let filtered = this.todos;

    if (!this.filters.showCompleted) {
      filtered = filtered.filter((t) => !t.done);
    }

    if (this.filters.searchTerm) {
      filtered = filtered.filter((t) =>
        t.text.toLowerCase().includes(this.filters.searchTerm.toLowerCase())
      );
    }

    if (this.filters.priority !== 'all') {
      filtered = filtered.filter((t) => t.priority === parseInt(this.filters.priority));
    }

    return filtered;
  }

  get allTags() {
    const tags = new Set();
    this.todos.forEach((todo) => {
      todo.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }

  get matrixSum() {
    return this.matrix.flat().reduce((sum, val) => sum + val, 0);
  }

  get matrixDiagonal() {
    return this.matrix.map((row, i) => row[i]);
  }
}

// Initialize store
createVorthainStore(RootStore);

/** @returns {RootStore} */
const useStore = () => {
  return useVglobal();
};

// ============= INDIVIDUAL TODO COMPONENT =============
// This component is wrapped with vGrip and only re-renders when its specific todo changes
const TodoItem = vGrip(({ todo }) => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  // Use useVstate instead of useState
  const state = useVstate({
    tagInput: '',
    showTags: false
  });

  return (
    <li className="todo-item">
      <div className="todo-main">
        <span
          style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
          onClick={() => store.toggleTodo(todo.id)}>
          {todo.text}
        </span>
        <div className="todo-actions">
          <button onClick={() => store.updateTodoPriority(todo.id, todo.priority + 1)}>
            P: {todo.priority}
          </button>
          <button onClick={() => (state.showTags = !state.showTags)}>
            Tags ({todo.tags.length})
          </button>
          <span className="render-badge">R: {renderCount.current}</span>
        </div>
      </div>
      {state.showTags && (
        <div className="todo-tags">
          <div className="tag-list">
            {todo.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button onClick={() => store.removeTodoTag(todo.id, tag)}>×</button>
              </span>
            ))}
          </div>
          <div className="tag-input">
            <input
              type="text"
              value={state.tagInput}
              onChange={(e) => (state.tagInput = e.target.value)}
              placeholder="Add tag..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && state.tagInput) {
                  store.addTodoTag(todo.id, state.tagInput);
                  state.tagInput = '';
                }
              }}
            />
          </div>
        </div>
      )}
      <div className="todo-info">
        ⚡ Only re-renders when THIS todo changes (text, done, priority, tags)
      </div>
    </li>
  );
});

// ============= COMPONENTS =============

// Component 1: Not wrapped with vGrip - tracks everything it accesses
const GlobalCounter = () => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div className="component-box">
      <h3>🔢 GlobalCounter (No vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <p>Counter: {store.counter}</p>
      <button onClick={store.incrementCounter}>Increment</button>
      <div className="info">
        ✅ Tracks: store.counter
        <br />
        🔄 Re-renders when: counter changes
        <br />❌ Not optimized - re-renders on every counter change
      </div>
    </div>
  );
};

// Component 2: Demonstrates getter dependencies
const ComplexGetterExample = vGrip(() => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div className="component-box">
      <h3>🧮 ComplexGetterExample (With vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <p>Filtered Todos Count: {store.filteredTodos.length}</p>
      <p>All Tags: {store.allTags.join(', ')}</p>
      <div className="filter-controls">
        <label>
          <input
            type="checkbox"
            checked={store.filters.showCompleted}
            onChange={(e) => store.updateFilter('showCompleted', e.target.checked)}
          />
          Show Completed
        </label>
        <input
          type="text"
          placeholder="Search..."
          value={store.filters.searchTerm}
          onChange={(e) => store.updateFilter('searchTerm', e.target.value)}
        />
      </div>
      <div className="info">
        ✅ Tracks: Complex computed getters with multiple dependencies
        <br />
        🔄 Re-renders when: filters change OR todos change
        <br />⚡ Getter caching prevents unnecessary recalculations
      </div>
    </div>
  );
});

// Component 3: Matrix operations - tests 2D array reactivity
const MatrixOperations = vGrip(() => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div className="component-box">
      <h3>🔢 MatrixOperations (With vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <div className="matrix-grid">
        {store.matrix.map((row, i) => (
          <div key={i} className="matrix-row">
            {row.map((cell, j) => (
              <input
                key={j}
                type="number"
                value={cell}
                onChange={(e) => store.updateMatrixCell(i, j, parseInt(e.target.value) || 0)}
                className="matrix-cell"
              />
            ))}
          </div>
        ))}
      </div>
      <p>
        Sum: {store.matrixSum} | Diagonal: [{store.matrixDiagonal.join(', ')}]
      </p>
      <div className="info">
        ✅ Tracks: 2D array mutations and computed properties
        <br />
        🔄 Re-renders when: any matrix cell changes
        <br />⚡ Deep array tracking works at any nesting level
      </div>
    </div>
  );
});

// Component 4: Async operations with local state
const AsyncDataLoader = vGrip(() => {
  const store = useStore();
  const state = useVstate({
    loading: false,
    data: null,
    error: null,

    async loadData() {
      state.loading = true;
      state.error = null;

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update local state
        state.data = {
          timestamp: Date.now(),
          todoCount: store.todos.length,
          message: `Loaded at counter value: ${store.counter}`
        };

        // Update store
        store.syncMetadata();
      } catch (err) {
        state.error = err.message;
      } finally {
        state.loading = false;
      }
    }
  });

  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div className="component-box">
      <h3>🔄 AsyncDataLoader (With vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <p>Sync Count: {store.metadata.syncCount}</p>
      <p>Last Sync: {new Date(store.metadata.lastSync).toLocaleTimeString()}</p>
      {state.loading && <p>Loading...</p>}
      {state.data && (
        <div className="async-data">
          <p>Message: {state.data.message}</p>
          <p>Todo Count at Load: {state.data.todoCount}</p>
        </div>
      )}
      <button onClick={state.loadData} disabled={state.loading}>
        Load Data
      </button>
      <div className="info">
        ✅ Tracks: Async operations with local and global state
        <br />
        🔄 Re-renders when: loading state OR data changes
        <br />⚡ Async mutations work seamlessly
      </div>
    </div>
  );
});

// Component 5: Enhanced TodoList with individual todo components
const TodoList = vGrip(() => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div className="component-box todo-list-container">
      <h3>📝 TodoList (With vGrip)</h3>
      <p className="render-count">List Renders: {renderCount.current}</p>
      <ul className="todo-list">
        {store.filteredTodos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
      <button onClick={() => store.addTodo(`New Todo ${Date.now()}`)}>Add Todo</button>
      <div className="info">
        ✅ Each TodoItem is wrapped with vGrip
        <br />
        🔄 List re-renders when: todos array length changes
        <br />⚡ Individual todos re-render independently
      </div>
    </div>
  );
});

// Component 6: Map/Set with nested objects
const AdvancedMapSetExample = vGrip(() => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  const addComplexCacheEntry = () => {
    const key = `complex_${Date.now()}`;
    store.cache.set(key, {
      data: {
        nested: {
          deep: {
            value: Math.random(),
            timestamp: Date.now()
          }
        }
      },
      metadata: {
        created: Date.now(),
        tags: ['cache', 'complex']
      }
    });
  };

  const updateCacheEntry = () => {
    const firstKey = store.cache.keys().next().value;
    if (firstKey) {
      const entry = store.cache.get(firstKey);
      if (entry && entry.data && entry.data.nested) {
        entry.data.nested.deep.value = Math.random();
        entry.metadata.tags.push(`updated_${Date.now()}`);
      }
    }
  };

  return (
    <div className="component-box">
      <h3>🗺️ AdvancedMapSetExample (With vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <p>Cache entries: {store.cache.size}</p>
      <div className="cache-entries">
        {Array.from(store.cache.entries())
          .slice(0, 3)
          .map(([key, value]) => (
            <div key={key} className="cache-entry">
              <span>{key.substring(0, 20)}...</span>
              {value.data && value.data.nested && (
                <span> Value: {value.data.nested.deep.value.toFixed(3)}</span>
              )}
            </div>
          ))}
      </div>
      <button onClick={addComplexCacheEntry}>Add Complex Entry</button>
      <button onClick={updateCacheEntry}>Update First Entry</button>
      <div className="info">
        ✅ Tracks: Nested objects inside Maps
        <br />
        🔄 Re-renders when: Map contents OR nested properties change
        <br />⚡ Deep mutations in Map values trigger updates
      </div>
    </div>
  );
});

// Component 7: Cross-component communication
const MessagePublisher = vGrip(() => {
  const store = useStore();
  const state = useVstate({
    message: '',

    publishMessage() {
      if (state.message) {
        // Add to cache as a message
        store.cache.set(`msg_${Date.now()}`, {
          type: 'message',
          content: state.message,
          author: store.user.name,
          timestamp: Date.now()
        });
        state.message = '';
      }
    }
  });

  const renderCount = React.useRef(0);
  renderCount.current++;

  return (
    <div className="component-box">
      <h3>📤 MessagePublisher (With vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <input
        type="text"
        value={state.message}
        onChange={(e) => (state.message = e.target.value)}
        placeholder="Type a message..."
        onKeyDown={(e) => e.key === 'Enter' && state.publishMessage()}
      />
      <button onClick={state.publishMessage}>Publish</button>
      <div className="info">
        ✅ Publishes to shared Map (store.cache)
        <br />
        🔄 Re-renders when: local message changes
        <br />⚡ Other components see updates immediately
      </div>
    </div>
  );
});

const MessageSubscriber = vGrip(() => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  // Use useVstate with a getter instead of computing in render
  const state = useVstate({
    get messages() {
      return Array.from(store.cache.entries())
        .filter(([key, value]) => value.type === 'message')
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 5);
    }
  });

  return (
    <div className="component-box">
      <h3>📥 MessageSubscriber (With vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <div className="message-list">
        {state.messages.map(([key, msg]) => (
          <div key={key} className="message">
            <strong>{msg.author}:</strong> {msg.content}
          </div>
        ))}
        {state.messages.length === 0 && <p>No messages yet</p>}
      </div>
      <div className="info">
        ✅ Subscribes to shared Map (store.cache)
        <br />
        🔄 Re-renders when: new messages added
        <br />⚡ Cross-component reactivity via shared state
      </div>
    </div>
  );
});

// Component 8: Performance stress test - Todo operations only
const TodoPerformanceTest = () => {
  const store = useStore();
  const renderCount = React.useRef(0);
  renderCount.current++;

  // Use useVstate instead of useState
  const state = useVstate({
    operationCount: 50,
    results: null,

    // Getter for results display
    get resultsDisplay() {
      if (!this.results) return null;
      return {
        batched: this.results.batched,
        bulk: this.results.bulk,
        time: this.results.time.toFixed(2),
        opsPerMs: !this.results.bulk
          ? (this.results.operations / this.results.time).toFixed(2)
          : null
      };
    }
  });

  // Generate test todos if needed
  const ensureTestTodos = () => {
    // Add test todos if we don't have enough
    while (store.todos.length < 20) {
      store.addTodo(`Test Todo ${store.todos.length + 1}`);
    }
  };

  const runTodoTest = (useBatch) => {
    ensureTestTodos();

    const todoIds = store.todos.map((t) => t.id);
    const start = performance.now();

    if (useBatch) {
      // Batched operations using vAction
      vAction(() => {
        // Perform multiple todo operations
        for (let i = 0; i < state.operationCount; i++) {
          const operation = i % 4;
          const todoIndex = i % todoIds.length;
          const todoId = todoIds[todoIndex];

          switch (operation) {
            case 0:
              // Toggle done status
              store.toggleTodo(todoId);
              break;
            case 1:
              // Update priority
              store.updateTodoPriority(todoId, (i % 5) + 1);
              break;
            case 2:
              // Add tag
              store.addTodoTag(todoId, `tag-${i}`);
              break;
            case 3:
              // Update text
              const todo = store.todos.find((t) => t.id === todoId);
              if (todo) {
                todo.text = `Updated ${i}`;
                todo.metadata.updated = Date.now();
              }
              break;
          }
        }
      });
    } else {
      // Unbatched operations
      for (let i = 0; i < state.operationCount; i++) {
        const operation = i % 4;
        const todoIndex = i % todoIds.length;
        const todoId = todoIds[todoIndex];

        switch (operation) {
          case 0:
            store.toggleTodo(todoId);
            break;
          case 1:
            store.updateTodoPriority(todoId, (i % 5) + 1);
            break;
          case 2:
            store.addTodoTag(todoId, `tag-${i}`);
            break;
          case 3:
            const todo = store.todos.find((t) => t.id === todoId);
            if (todo) {
              todo.text = `Updated ${i}`;
              todo.metadata.updated = Date.now();
            }
            break;
        }
      }
    }

    const end = performance.now();
    state.results = {
      time: end - start,
      batched: useBatch,
      operations: state.operationCount
    };
  };

  const runBulkTest = () => {
    ensureTestTodos();

    const todoIds = store.todos.map((t) => t.id);
    const start = performance.now();

    vAction(() => {
      // Bulk toggle multiple todos
      store.bulkToggleTodos(todoIds.slice(0, 5));

      // Bulk update priorities
      const priorityUpdates = todoIds.slice(0, 10).map((id, i) => ({
        id,
        priority: (i % 5) + 1
      }));
      store.bulkUpdatePriorities(priorityUpdates);

      // Bulk add tags
      const tagUpdates = todoIds.slice(0, 8).map((id, i) => ({
        id,
        tags: [`bulk-${i}`, `test-${i}`]
      }));
      store.bulkAddTags(tagUpdates);
    });

    const end = performance.now();
    state.results = {
      time: end - start,
      batched: true,
      operations: 'Bulk operations',
      bulk: true
    };
  };

  return (
    <div className="component-box">
      <h3>⚡ TodoPerformanceTest (No vGrip)</h3>
      <p className="render-count">Renders: {renderCount.current}</p>
      <p>Current Todos: {store.todos.length}</p>

      <div className="test-controls">
        <label>
          Operations:
          <input
            type="number"
            value={state.operationCount}
            onChange={(e) => (state.operationCount = parseInt(e.target.value) || 50)}
            min="10"
            max="500"
            step="10"
          />
        </label>
      </div>

      <div className="test-buttons">
        <button onClick={() => runTodoTest(true)}>Run Batched ({state.operationCount} ops)</button>
        <button onClick={() => runTodoTest(false)}>
          Run Unbatched ({state.operationCount} ops)
        </button>
        <button onClick={runBulkTest}>Run Bulk Operations</button>
      </div>

      {state.resultsDisplay && (
        <div className="results">
          <p>
            {state.resultsDisplay.batched ? '✅ Batched' : '❌ Unbatched'}{' '}
            {state.resultsDisplay.bulk ? '(Bulk)' : ''}
          </p>
          <p>Time: {state.resultsDisplay.time}ms</p>
          {state.resultsDisplay.opsPerMs && <p>Ops/ms: {state.resultsDisplay.opsPerMs}</p>}
        </div>
      )}

      <div className="info">
        ✅ Tests: Todo-specific operations with vAction
        <br />
        🔄 Batched: Single re-render for all todo changes
        <br />❌ Unbatched: Multiple re-renders for each operation
        <br />⚡ Bulk operations: Efficient multi-todo updates
        <br />❌ Actually this is best demonstrated in example-ts, here the mutations are not
        demanding
      </div>
    </div>
  );
};

// Main App
function App() {
  return (
    <div className="App">
      <header>
        <h1>🚀 Vorthain React State - Advanced Test Suite</h1>
        <p>Comprehensive demonstration of fine-grained reactivity and optimization</p>
      </header>

      <div className="grid">
        <GlobalCounter />
        <ComplexGetterExample />
        <MatrixOperations />
        <AsyncDataLoader />
        <TodoList />
        <AdvancedMapSetExample />
        <MessagePublisher />
        <MessageSubscriber />
        <TodoPerformanceTest />
      </div>

      <footer>
        <h3>🎯 Key Demonstrations:</h3>
        <ul>
          <li>✅ Individual todo items with vGrip only re-render when their data changes</li>
          <li>✅ Complex getters with multiple dependencies update efficiently</li>
          <li>✅ 2D arrays (matrices) with deep reactivity at any nesting level</li>
          <li>✅ Async operations seamlessly integrate with reactive state</li>
          <li>✅ Maps with deeply nested objects trigger updates on any mutation</li>
          <li>✅ Cross-component communication via shared reactive state</li>
          <li>✅ Performance benefits of vAction batching on todo operations</li>
          <li>✅ Bulk todo operations for efficient multi-item updates</li>
          <li>✅ Tags, metadata, and complex nested structures all fully reactive</li>
        </ul>
      </footer>
    </div>
  );
}

export default App;
