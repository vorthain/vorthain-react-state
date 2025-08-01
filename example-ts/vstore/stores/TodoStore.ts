import type { RootStore } from '../RootStore';

export class TodoStore {
  rootStore: RootStore; // Manual declaration for autocomplete

  todos = [
    {
      toggled: false,
      name: 'Learn Vorthain',
      counter: 0,
      priority: 'medium',
      nested: {
        keywords: ['react', 'state', 'mutable'],
        someNumber: 42
      }
    },
    {
      toggled: true,
      name: 'Build awesome app',
      counter: 5,
      priority: 'high',
      nested: {
        keywords: ['javascript', 'typescript'],
        someNumber: 99
      }
    }
  ];

  apiData: any = null;
  isLoading = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore; // Manual assignment
    console.log('TodoStore initialized - setup WebSocket, EventEmitter, etc.');
  }

  get completedCount() {
    return this.todos.filter((todo) => todo.toggled).length;
  }

  get highPriorityTodos() {
    return this.todos.filter((todo) => todo.priority === 'high');
  }

  addTodo = (name: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    this.todos.push({
      toggled: false,
      name,
      counter: 0,
      priority,
      nested: {
        keywords: [],
        someNumber: Math.floor(Math.random() * 100)
      }
    });

    // Cross-store communication with perfect autocomplete!
    if (!this.rootStore.isToggledExample) {
      this.rootStore.isToggledExample = true;
    }
  };

  removeTodo = (index: number) => {
    this.todos.splice(index, 1);
  };

  toggleTodo = (index: number) => {
    this.todos[index].toggled = !this.todos[index].toggled;
  };

  incrementCounter = (index: number) => {
    this.todos[index].counter++;
  };

  addKeyword = (todoIndex: number, keyword: string) => {
    this.todos[todoIndex].nested.keywords.push(keyword);
  };

  removeKeyword = (todoIndex: number, keywordIndex: number) => {
    this.todos[todoIndex].nested.keywords.splice(keywordIndex, 1);
  };

  fetchApiData = async () => {
    this.isLoading = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();

      this.apiData = data;
    } catch (error) {
      this.apiData = { error: 'Failed to fetch data' };
    } finally {
      this.isLoading = false;
    }
  };
}
