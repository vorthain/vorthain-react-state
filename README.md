# 🚀 @vorthain/react-state

[![npm](https://img.shields.io/npm/v/@vorthain/react-state.svg)](https://www.npmjs.com/package/@vorthain/react-state)
[![Downloads](https://img.shields.io/npm/dm/@vorthain/react-state.svg)](https://www.npmjs.com/package/@vorthain/react-state)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@vorthain/react-state)](https://bundlephobia.com/package/@vorthain/react-state)

**Zero-configuration reactive state for React**

Write natural, mutable code and watch your components update automatically. No reducers, no dispatchers, no complex patterns.

```jsx
const state = useVstate({
  count: 0,
  increment: () => state.count++,
  get isEven() { return state.count % 2 === 0; }
});

return (
  <div>
    <p>{state.count} ({state.isEven ? 'Even' : 'Odd'})</p>
    <button onClick={state.increment}>+1</button>
  </div>
);
```

## Installation

```bash
npm install @vorthain/react-state
```

## Why Choose Simplicity?

Compare these two approaches for updating a nested property:

**Traditional React (useReducer + immutable updates):**
```jsx
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

// Usage
dispatch({ type: 'UPDATE_PAGE_TITLE', pageId: page.id, newTitle: page.title + ' - Edited' });
```

**Vorthain (direct mutation):**
```jsx
page.title = page.title + ' - Edited';
```

## Quick Start

### Local State with useVstate

```jsx
import { useVstate } from '@vorthain/react-state';

function Counter() {
  const state = useVstate({
    count: 0,
    increment: () => state.count++,
    decrement: () => state.count--,
    get doubled() { return state.count * 2; }
  });

  return (
    <div>
      <p>Count: {state.count}</p>
      <p>Doubled: {state.doubled}</p>
      <button onClick={state.increment}>+1</button>
      <button onClick={state.decrement}>-1</button>
    </div>
  );
}
```

### Global State with useVglobal

**1. Create your stores:**

```jsx
// stores/TodoStore.js
export class TodoStore {
  /** @param {import('./RootStore').RootStore} rootStore */
  constructor(rootStore) {
    this.rootStore = rootStore; // For cross-store communication
    this.todos = [];
  }
  
  addTodo = (text) => {
    this.todos.push({ 
      id: Date.now(), 
      text, 
      done: false,
      priority: 'medium'
    });
    
    // Can access other stores
    this.rootStore.userStore.updateLastActivity();
  }
  
  toggleTodo = (id) => {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done;
  }
  
  get completedCount() {
    return this.todos.filter(t => t.done).length;
  }
}

// stores/UserStore.js
export class UserStore {
  /** @param {import('./RootStore').RootStore} rootStore */
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.name = 'John';
    this.preferences = { theme: 'dark' };
    this.lastActivity = Date.now();
  }
  
  updateLastActivity = () => {
    this.lastActivity = Date.now();
  }
  
  setTheme = (theme) => {
    this.preferences.theme = theme;
  }
}

// stores/RootStore.js
import { TodoStore } from './TodoStore';
import { UserStore } from './UserStore';

export class RootStore {
  constructor() {
    this.todoStore = new TodoStore(this);
    this.userStore = new UserStore(this);
  }
  
  // Root-level computed properties can access all stores
  get appTitle() {
    return `${this.userStore.name}'s Todos (${this.todoStore.completedCount} done)`;
  }
}
```

**2. Create a hook that initializes and provides the store:**

```jsx
// hooks/useStore.js - Everything in one place!
import { createVorthainStore, useVglobal } from '@vorthain/react-state';
import { RootStore } from '../stores/RootStore';

// Initialize store
createVorthainStore(RootStore);

// Export typed hook for use in components
/** @returns {import('../stores/RootStore').RootStore} */
export const useStore = () => useVglobal();
```

**3. Import and use anywhere:**

```jsx
// components/TodoApp.jsx
import { useStore } from '../hooks/useStore';

function TodoApp() {
  const store = useStore(); // Full autocomplete!
  
  return (
    <div>
      <h1>{store.appTitle}</h1>
      <p>User: {store.userStore.name}</p>
      <p>Todos: {store.todoStore.completedCount}/{store.todoStore.todos.length}</p>
      
      <button onClick={() => store.todoStore.addTodo('New Task')}>
        Add Todo
      </button>
      
      {store.todoStore.todos.map(todo => (
        <div key={todo.id}>
          <input 
            type="checkbox" 
            checked={todo.done}
            onChange={() => store.todoStore.toggleTodo(todo.id)}
          />
          {todo.text}
        </div>
      ))}
    </div>
  );
}

// components/UserProfile.jsx  
import { useStore } from '../hooks/useStore';

function UserProfile() {
  const store = useStore(); // Same hook, full autocomplete!
  
  return (
    <div>
      <h2>{store.userStore.name}</h2>
      <button onClick={() => store.userStore.setTheme('light')}>
        Switch Theme
      </button>
    </div>
  );
}
```

## Fine-Grained Reactivity with vGrip

Optimize components to only re-render when their specific dependencies change:

```jsx
import { vGrip } from '@vorthain/react-state';

// Individual todo items only re-render when their data changes
const TodoItem = vGrip(({ todo }) => {
  return (
    <div>
      <input 
        type="checkbox" 
        checked={todo.done}
        onChange={() => todo.done = !todo.done}
      />
      <span>{todo.text}</span>
      <button onClick={() => todo.priority = 'high'}>
        Mark High Priority
      </button>
    </div>
  );
});

// Todo list only re-renders when array changes
const TodoList = vGrip(() => {
  const store = useVglobal();
  
  return (
    <div>
      <h2>Todos ({store.todos.length})</h2>
      {store.todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
});
```

## Batching Updates with vAction

Batch multiple mutations into a single re-render:

```jsx
import { vAction } from '@vorthain/react-state';

const addManyTodos = () => {
  vAction(() => {
    // All mutations happen, then one re-render
    for (let i = 0; i < 100; i++) {
      store.todos.push({ text: `Todo ${i}` });
    }
    store.user.preferences.lastBulkAdd = Date.now();
  });
};
```

## Core Features

### Direct Mutations

Everything works with natural JavaScript:

```jsx
// Objects
state.user.name = 'Jane';
state.user.settings.theme = 'light';

// Arrays  
state.items.push(newItem);
state.items[0] = updatedItem;
state.items.splice(2, 1);

// Maps
state.cache.set('key', value);
state.cache.delete('key');

// Sets
state.tags.add('react');
state.tags.delete('vue');
```

### Computed Properties (Getters)

```jsx
const state = useVstate({
  todos: [],
  filter: 'all',
  
  get filteredTodos() {
    switch(state.filter) {
      case 'done': return state.todos.filter(t => t.done);
      case 'active': return state.todos.filter(t => !t.done);
      default: return state.todos;
    }
  },
  
  get completedCount() {
    return state.todos.filter(t => t.done).length;
  },
  
  get activeCount() {
    return state.todos.filter(t => !t.done).length;
  },
  
  get completedPercentage() {
    return state.todos.length > 0 
      ? Math.round((state.completedCount / state.todos.length) * 100)
      : 0;
  }
});
```

### Deep Reactivity

Nested changes are automatically tracked:

```jsx
const state = useVstate({
  company: {
    name: 'Acme Corp',
    employees: [
      { name: 'John', tasks: ['Design', 'Code'] },
      { name: 'Jane', tasks: ['Test', 'Deploy'] }
    ]
  }
});

// All of these trigger re-renders:
state.company.name = 'New Corp';
state.company.employees[0].name = 'Johnny';
state.company.employees[1].tasks.push('Document');
```

## TypeScript & JavaScript Support

### TypeScript

**Full TypeScript support with proper typing:**

**Note on Strict Mode:** If you have `"strict": true` in your `tsconfig.json`, `useVstate`'s type inference works best when you provide an initializer function.

**Do this:**
```tsx
const state = useVstate(() => ({ count: 0 }));
```

**Instead of this:**
```tsx
const state = useVstate({ count: 0 });
```

```tsx
// stores/RootStore.ts
import { UserStore } from './UserStore';
import { TodoStore } from './TodoStore';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

export class TodoStore {
  rootStore: RootStore;
  todos: Todo[] = [];
  
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }
  // ... other methods
}

export class UserStore {
    rootStore: RootStore;
    name = 'Jane';

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
    }
    // ... other methods
}

export class RootStore {
  todoStore: TodoStore;
  userStore: UserStore;
  
  constructor() {
    this.todoStore = new TodoStore(this);
    this.userStore = new UserStore(this);
  }
}

// hooks/useStore.ts - Initialize and export typed hook
import { createVorthainStore, useVglobal } from '@vorthain/react-state';
import { RootStore } from '../stores/RootStore';

// Initialize store (happens once)
createVorthainStore(RootStore);

// Export typed hook
export const useStore = (): RootStore => {
  return useVglobal();
};
```

### JavaScript

**Full autocomplete support using JSDoc:**

```jsx
// stores/TodoStore.js
export class TodoStore {
  /** @param {import('./RootStore').RootStore} rootStore */
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.todos = [];
  }
  // ... methods
}

// stores/UserStore.js
export class UserStore {
  /** @param {import('./RootStore').RootStore} rootStore */
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.name = 'John';
  }
  // ... methods
}

// stores/RootStore.js
import { TodoStore } from './TodoStore';
import { UserStore } from './UserStore';

export class RootStore {
  constructor() {
    this.todoStore = new TodoStore(this);
    this.userStore = new UserStore(this);
  }
  
  get appTitle() {
    return `${this.userStore.name}'s Todos`;
  }
}

// hooks/useStore.js - Initialize and export typed hook
import { createVorthainStore, useVglobal } from '@vorthain/react-state';
import { RootStore } from '../stores/RootStore';

// Initialize store (happens once)
createVorthainStore(RootStore);

// Export typed hook
/** @returns {RootStore} */
export const useStore = () => {
  return useVglobal();
};
```

## API Reference

### `useVstate(initialState)`

Creates reactive local state for a component.

```jsx
const state = useVstate({
  count: 0,
  increment: () => state.count++
});
```

### `createVorthainStore(StoreClass)`

Initializes global store. Call once at app startup.

```jsx
createVorthainStore(RootStore);
```

### `useVglobal()`

Returns the global store instance.

```jsx
const store = useVglobal();
```

### `vGrip(Component)`

Higher-order component that adds fine-grained reactivity. Component only re-renders when accessed properties change.

```jsx
const OptimizedComponent = vGrip(({ data }) => {
  return <div>{data.value}</div>;
});
```

### `vAction(fn)`

Batches multiple mutations into a single re-render.

```jsx
vAction(() => {
  state.a = 1;
  state.b = 2;
  state.c = 3;
});
```

## Common Patterns

### Cross-Store Communication

```jsx
// For JavaScript with autocomplete
class TodoStore {
  /** @param {RootStore} rootStore */
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.todos = [];
  }
  
  addTodo = (text) => {
    this.todos.push({ text, done: false });
    // Access other stores with full autocomplete
    this.rootStore.uiStore.showNotification('Todo added!');
    this.rootStore.analyticsStore.track('todo_added');
  }
}

class RootStore {
  constructor() {
    this.todoStore = new TodoStore(this);
    this.uiStore = new UIStore(this);
    this.analyticsStore = new AnalyticsStore(this);
  }
}
```

### Async Actions

```jsx
const state = useVstate({
  data: null,
  loading: false,
  error: null,
  
  async fetchData() {
    state.loading = true;
    state.error = null;
    
    try {
      const response = await fetch('/api/data');
      state.data = await response.json();
    } catch (err) {
      state.error = err.message;
    } finally {
      state.loading = false;
    }
  }
});
```

### Computed Values with Parameters

```jsx
const state = useVstate({
  todos: [],
  
  // Use a method instead of getter for parameterized computed values
  getTodosByPriority(priority) {
    return state.todos.filter(t => t.priority === priority);
  },
  
  // Can still use getters for simple computed values
  get highPriorityCount() {
    return state.getTodosByPriority('high').length;
  }
});
```

### Combining Local and Global State

```jsx
function TodoEditor() {
  const store = useVglobal();
  const state = useVstate({
    editingId: null,
    tempText: '',
    
    startEdit(todo) {
      state.editingId = todo.id;
      state.tempText = todo.text;
    },
    
    saveEdit() {
      const todo = store.todos.find(t => t.id === state.editingId);
      if (todo) {
        todo.text = state.tempText;
        state.editingId = null;
      }
    },
    
    get isEditing() {
      return state.editingId !== null;
    }
  });

  return (
    <div>
      {store.todos.map(todo => (
        <div key={todo.id}>
          {state.editingId === todo.id ? (
            <input 
              value={state.tempText}
              onChange={e => state.tempText = e.target.value}
              onBlur={state.saveEdit}
            />
          ) : (
            <span onClick={() => state.startEdit(todo)}>
              {todo.text}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

**Ready to simplify your state management?**

```bash
npm install @vorthain/react-state
```

---
## How It Works
<small>
The magic behind `@vorthain/react-state` is a system of **ES6 Proxies** that wraps your state objects. This allows the library to intercept property access and mutations without requiring you to use special functions or immutable patterns.

* **Dependency Tracking**: When your component renders, every property of the state object you access (e.g., `state.count`) is recorded. The `get` trap of the Proxy registers the component as a "subscriber" to that specific property. For computed properties (getters), it tracks all the underlying properties they access, creating a dependency graph.

* **Automatic Updates**: When you mutate a property (e.g., `state.count++`), the Proxy's `set` trap is triggered. It looks up all the components that subscribed to that property and queues them for a re-render. This process is highly efficient because only the components that actually depend on the changed data are updated.

* **Data Structure Support**: The library uses specialized Proxy handlers to support various data structures, ensuring reactivity is preserved everywhere:
    * **Objects**: Plain objects are deeply wrapped in Proxies. Any change to a nested property (e.g., `state.user.preferences.theme = 'dark'`) will trigger an update.
    * **Arrays**: Methods that mutate arrays (`push`, `pop`, `splice`, etc.) are intercepted. Calling `state.items.push(newItem)` notifies subscribers of both the new item and the array's `length` property.
    * **Maps & Sets**: Methods like `set`, `add`, `delete`, and `clear` are also proxied. Changing a Map or Set will correctly trigger updates for components that iterate over them or access their `size`.

* **Fine-Grained Rendering (`vGrip`)**: The `vGrip` HOC enhances this by creating a dedicated tracker for each wrapped component. Instead of the entire component subscribing to state changes, `vGrip` tracks dependencies *during the render phase* and ensures the component only re-renders if the exact data it used has changed.

* **Update Batching (`vAction`)**: To prevent multiple, rapid-fire re-renders from a series of mutations, `vAction` wraps them in a batch. It collects all notifications and then triggers a single, consolidated re-render at the end of the action.
</small>
