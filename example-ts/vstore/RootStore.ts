import { TodoStore } from './stores/TodoStore';

export class RootStore {
  isToggledExample = false;
  todoStore: TodoStore; // Manual declaration for autocomplete

  constructor() {
    console.log('RootStore initialized - setup global listeners, auth, etc.');

    // Manual instantiation with typing
    this.todoStore = new TodoStore(this);
  }

  toggleExample = () => {
    this.isToggledExample = !this.isToggledExample;
  };

  get appStats() {
    return {
      user: 'Test User',
      totalTodos: this.todoStore.todos.length,
      completedTodos: this.todoStore.completedCount,
      isActive: this.isToggledExample
    };
  }
}
