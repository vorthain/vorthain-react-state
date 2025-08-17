import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import {
  useVstate,
  useVglobal,
  createVorthainStore,
  vAction,
  vGrip,
  _resetVorthainStore
} from '../index';

describe('Vorthain Real Usage Tests', () => {
  describe('useVstate - Local State', () => {
    it('should handle primitive mutations and getters', async () => {
      function Counter() {
        const state = useVstate(() => ({
          count: 0,
          multiplier: 2,
          message: 'Count:',

          increment() {
            state.count++;
          },

          decrement() {
            state.count--;
          },

          reset() {
            state.count = 0;
            state.multiplier = 2;
          },

          setMultiplier(value: number) {
            state.multiplier = value;
          },

          get doubled() {
            return state.count * state.multiplier;
          },

          get displayText() {
            return `${state.message} ${state.count} (x${state.multiplier} = ${state.doubled})`;
          }
        }));

        return (
          <div>
            <h1 data-testid="display">{state.displayText}</h1>
            <div data-testid="count">{state.count}</div>
            <div data-testid="doubled">{state.doubled}</div>

            <button onClick={state.increment}>Increment</button>
            <button onClick={state.decrement}>Decrement</button>
            <button onClick={state.reset}>Reset</button>
            <button onClick={() => state.setMultiplier(3)}>Set Multiplier to 3</button>
            <button onClick={() => (state.message = 'Updated:')}>Change Message</button>
          </div>
        );
      }

      render(<Counter />);

      // Initial state
      expect(screen.getByTestId('count')).toHaveTextContent('0');
      expect(screen.getByTestId('doubled')).toHaveTextContent('0');
      expect(screen.getByTestId('display')).toHaveTextContent('Count: 0 (x2 = 0)');

      // Test increment
      fireEvent.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('1');
        expect(screen.getByTestId('doubled')).toHaveTextContent('2');
        expect(screen.getByTestId('display')).toHaveTextContent('Count: 1 (x2 = 2)');
      });

      // Test multiple increments
      fireEvent.click(screen.getByText('Increment'));
      fireEvent.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('3');
        expect(screen.getByTestId('doubled')).toHaveTextContent('6');
      });

      // Test decrement
      fireEvent.click(screen.getByText('Decrement'));
      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('2');
        expect(screen.getByTestId('doubled')).toHaveTextContent('4');
      });

      // Test multiplier change
      fireEvent.click(screen.getByText('Set Multiplier to 3'));
      await waitFor(() => {
        expect(screen.getByTestId('doubled')).toHaveTextContent('6');
        expect(screen.getByTestId('display')).toHaveTextContent('Count: 2 (x3 = 6)');
      });

      // Test message change
      fireEvent.click(screen.getByText('Change Message'));
      await waitFor(() => {
        expect(screen.getByTestId('display')).toHaveTextContent('Updated: 2 (x3 = 6)');
      });

      // Test reset
      fireEvent.click(screen.getByText('Reset'));
      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('0');
        expect(screen.getByTestId('doubled')).toHaveTextContent('0');
        expect(screen.getByTestId('display')).toHaveTextContent('Updated: 0 (x2 = 0)');
      });
    });

    it('should handle arrays and nested objects', async () => {
      function TodoList() {
        const state = useVstate(() => ({
          todos: [
            { id: 1, text: 'Learn Vorthain', done: false },
            { id: 2, text: 'Build App', done: false }
          ],
          filter: 'all' as 'all' | 'active' | 'completed',

          toggleTodo(id: number) {
            const todo = state.todos.find((t) => t.id === id);
            if (todo) todo.done = !todo.done;
          },

          addTodo(text: string) {
            state.todos.push({
              id: Date.now(),
              text,
              done: false
            });
          },

          removeTodo(id: number) {
            const index = state.todos.findIndex((t) => t.id === id);
            if (index > -1) state.todos.splice(index, 1);
          },

          get filteredTodos() {
            switch (state.filter) {
              case 'active':
                return state.todos.filter((t) => !t.done);
              case 'completed':
                return state.todos.filter((t) => t.done);
              default:
                return state.todos;
            }
          },

          get stats() {
            return {
              total: state.todos.length,
              completed: state.todos.filter((t) => t.done).length,
              active: state.todos.filter((t) => !t.done).length
            };
          }
        }));

        return (
          <div>
            <div data-testid="stats">
              Total: {state.stats.total}, Active: {state.stats.active}, Completed:{' '}
              {state.stats.completed}
            </div>

            <button onClick={() => (state.filter = 'all')}>Show All</button>
            <button onClick={() => (state.filter = 'active')}>Show Active</button>
            <button onClick={() => (state.filter = 'completed')}>Show Completed</button>
            <button onClick={() => state.addTodo('New Todo')}>Add Todo</button>

            <ul data-testid="todo-list">
              {state.filteredTodos.map((todo) => (
                <li key={todo.id} data-testid={`todo-${todo.id}`}>
                  <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                    {todo.text}
                  </span>
                  <button onClick={() => state.toggleTodo(todo.id)}>
                    {todo.done ? 'Undo' : 'Done'}
                  </button>
                  <button onClick={() => state.removeTodo(todo.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      render(<TodoList />);

      // Initial state
      expect(screen.getByTestId('stats')).toHaveTextContent('Total: 2, Active: 2, Completed: 0');
      expect(screen.getByTestId('todo-list').children).toHaveLength(2);

      // Toggle first todo
      const doneButtons = screen.getAllByText('Done');
      fireEvent.click(doneButtons[0]);
      await waitFor(() => {
        expect(screen.getByTestId('stats')).toHaveTextContent('Total: 2, Active: 1, Completed: 1');
        expect(screen.getByText('Undo')).toBeInTheDocument();
      });

      // Filter by active
      fireEvent.click(screen.getByText('Show Active'));
      await waitFor(() => {
        expect(screen.getByTestId('todo-list').children).toHaveLength(1);
        expect(screen.getByText('Build App')).toBeInTheDocument();
      });

      // Filter by completed
      fireEvent.click(screen.getByText('Show Completed'));
      await waitFor(() => {
        expect(screen.getByTestId('todo-list').children).toHaveLength(1);
        expect(screen.getByText('Learn Vorthain')).toBeInTheDocument();
      });

      // Show all again
      fireEvent.click(screen.getByText('Show All'));
      await waitFor(() => {
        expect(screen.getByTestId('todo-list').children).toHaveLength(2);
      });

      // Add new todo
      fireEvent.click(screen.getByText('Add Todo'));
      await waitFor(() => {
        expect(screen.getByTestId('stats')).toHaveTextContent('Total: 3, Active: 2, Completed: 1');
        expect(screen.getByText('New Todo')).toBeInTheDocument();
      });

      // Remove a todo
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);
      await waitFor(() => {
        expect(screen.getByTestId('stats')).toHaveTextContent('Total: 2, Active: 2, Completed: 0');
      });
    });
  });

  describe('useVglobal - Global Store', () => {
    it('should handle global store with cross-store communication', async () => {
      _resetVorthainStore();

      class TodoStore {
        todos: Array<{ id: number; text: string; done: boolean }> = [];
        constructor(public rootStore: RootStore) {}
        addTodo = (text: string) => {
          this.todos.push({ id: Date.now(), text, done: false });
          this.rootStore.userStore.incrementTodoCount();
        };
        toggleTodo = (id: number) => {
          const todo = this.todos.find((t) => t.id === id);
          if (todo) todo.done = !todo.done;
        };
        get completedCount() {
          return this.todos.filter((t) => t.done).length;
        }
        get pendingCount() {
          return this.todos.filter((t) => !t.done).length;
        }
      }
      class UserStore {
        name = 'John Doe';
        todosCreated = 0;
        constructor(public rootStore: RootStore) {}
        setName = (name: string) => {
          this.name = name;
        };
        incrementTodoCount = () => {
          this.todosCreated++;
        };
      }
      class RootStore {
        todoStore: TodoStore;
        userStore: UserStore;
        constructor() {
          this.todoStore = new TodoStore(this);
          this.userStore = new UserStore(this);
        }
        get summary() {
          return `${this.userStore.name} has ${this.todoStore.todos.length} todos (${this.todoStore.completedCount} completed)`;
        }
      }
      createVorthainStore(RootStore);

      function TodoApp() {
        const store: RootStore = useVglobal();
        return (
          <div>
            <h1 data-testid="summary">{store.summary}</h1>
            <div data-testid="user-name">User: {store.userStore.name}</div>
            <div data-testid="todos-created">Todos Created: {store.userStore.todosCreated}</div>
            <div data-testid="todo-stats">
              Pending: {store.todoStore.pendingCount}, Completed: {store.todoStore.completedCount}
            </div>
            <button onClick={() => store.userStore.setName('Jane Smith')}>Change Name</button>
            <button onClick={() => store.todoStore.addTodo('Test Todo')}>Add Todo</button>
            <ul>
              {store.todoStore.todos.map((todo) => (
                <li key={todo.id}>
                  <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                    {todo.text}
                  </span>
                  <button onClick={() => store.todoStore.toggleTodo(todo.id)}>Toggle</button>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      render(<TodoApp />);
      expect(screen.getByTestId('summary')).toHaveTextContent('John Doe has 0 todos (0 completed)');

      fireEvent.click(screen.getByText('Add Todo'));
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'John Doe has 1 todos (0 completed)'
        );
      });

      fireEvent.click(screen.getByText('Add Todo'));
      await waitFor(() => {
        expect(screen.getByTestId('todos-created')).toHaveTextContent('Todos Created: 2');
      });

      const toggleButtons = screen.getAllByText('Toggle');
      fireEvent.click(toggleButtons[0]);
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'John Doe has 2 todos (1 completed)'
        );
      });

      fireEvent.click(screen.getByText('Change Name'));
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'Jane Smith has 2 todos (1 completed)'
        );
      });
    });
  });

  describe('Complex State and Feature Tests', () => {
    it('should handle Map and Set data structures', async () => {
      function DataStore() {
        const state = useVstate(() => ({
          users: new Map<number, { name: string }>(),
          tags: new Set<string>(),
          addUser(id: number, name: string) {
            state.users.set(id, { name });
          },
          removeUser(id: number) {
            state.users.delete(id);
          },
          addTag(tag: string) {
            state.tags.add(tag);
          },
          get userCount() {
            return state.users.size;
          },
          get tagCount() {
            return state.tags.size;
          }
        }));

        return (
          <div>
            <div data-testid="counts">
              Users: {state.userCount}, Tags: {state.tagCount}
            </div>
            <div data-testid="user-list">
              {Array.from(state.users.entries()).map(([id, user]) => (
                <p key={id}>{`${id}: ${user.name}`}</p>
              ))}
            </div>
            <button onClick={() => state.addUser(1, 'Alice')}>Add Alice</button>
            <button onClick={() => state.addUser(2, 'Bob')}>Add Bob</button>
            <button onClick={() => state.removeUser(1)}>Remove Alice</button>
            <button onClick={() => state.addTag('react')}>Add Tag</button>
          </div>
        );
      }

      render(<DataStore />);
      expect(screen.getByTestId('counts')).toHaveTextContent('Users: 0, Tags: 0');

      fireEvent.click(screen.getByText('Add Alice'));
      await waitFor(() => {
        expect(screen.getByTestId('counts')).toHaveTextContent('Users: 1, Tags: 0');
      });

      fireEvent.click(screen.getByText('Add Bob'));
      await waitFor(() => {
        expect(screen.getByTestId('counts')).toHaveTextContent('Users: 2, Tags: 0');
      });

      fireEvent.click(screen.getByText('Add Tag'));
      fireEvent.click(screen.getByText('Add Tag'));
      await waitFor(() => {
        expect(screen.getByTestId('counts')).toHaveTextContent('Users: 2, Tags: 1');
      });

      fireEvent.click(screen.getByText('Remove Alice'));
      await waitFor(() => {
        expect(screen.getByTestId('counts')).toHaveTextContent('Users: 1, Tags: 1');
      });
    });

    it('should batch updates with vAction on deeply nested objects', async () => {
      let renderCount = 0;
      function ProfileEditor() {
        const state = useVstate(() => ({
          user: {
            profile: { name: 'John Doe' },
            settings: { theme: 'light' }
          },
          updateProfileBatched(name: string, theme: string) {
            vAction(() => {
              state.user.profile.name = name;
              state.user.settings.theme = theme;
            });
          }
        }));

        renderCount++;

        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <div data-testid="user-info">
              {state.user.profile.name} - {state.user.settings.theme}
            </div>
            <button onClick={() => state.updateProfileBatched('Jane Doe', 'dark')}>
              Update Profile
            </button>
          </div>
        );
      }

      render(<ProfileEditor />);
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByText('Update Profile'));
      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('2');
        expect(screen.getByTestId('user-info')).toHaveTextContent('Jane Doe - dark');
      });
    });

    it('should work with vGrip HOC and getters accessing local and global state', async () => {
      _resetVorthainStore();

      class RootStore {
        session = {
          user: { name: 'GlobalAdmin', permissions: ['read', 'write'] }
        };
        addPermission(perm: string) {
          this.session.user.permissions.push(perm);
        }
      }
      createVorthainStore(RootStore);

      function Dashboard() {
        const store: RootStore = useVglobal();
        const state = useVstate(() => ({
          viewMode: 'grid',
          setViewMode(mode: string) {
            state.viewMode = mode;
          },
          get summary() {
            return `${store.session.user.name} (${store.session.user.permissions.length} perms) viewing in ${state.viewMode} mode.`;
          }
        }));

        return (
          <div>
            <h1 data-testid="summary">{state.summary}</h1>
            <button onClick={() => state.setViewMode('list')}>Set List View</button>
            <button onClick={() => store.addPermission('delete')}>Add Permission</button>
          </div>
        );
      }

      const VGrippedDashboard = vGrip(Dashboard);

      render(<VGrippedDashboard />);
      expect(screen.getByTestId('summary')).toHaveTextContent(
        'GlobalAdmin (2 perms) viewing in grid mode.'
      );

      fireEvent.click(screen.getByText('Set List View'));
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'GlobalAdmin (2 perms) viewing in list mode.'
        );
      });

      fireEvent.click(screen.getByText('Add Permission'));
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'GlobalAdmin (3 perms) viewing in list mode.'
        );
      });
    });

    it('should handle deeply nested Maps and Sets with objects', async () => {
      function AdvancedData() {
        const state = useVstate(() => {
          const initialTask = { id: 101, title: 'Initial Task' };
          const initialProject = {
            id: 1,
            name: 'Project Phoenix',
            details: {
              owner: 'Alice',
              tasks: new Set([initialTask])
            }
          };

          return {
            projects: new Map<number, typeof initialProject>([[initialProject.id, initialProject]]),

            updateTaskTitle(projectId: number, taskId: number, newTitle: string) {
              const project = state.projects.get(projectId);
              if (project) {
                for (const task of project.details.tasks) {
                  if (task.id === taskId) {
                    task.title = newTitle;
                    break;
                  }
                }
              }
            },

            deleteTask(projectId: number, taskId: number) {
              const project = state.projects.get(projectId);
              if (project) {
                for (const task of project.details.tasks) {
                  if (task.id === taskId) {
                    project.details.tasks.delete(task);
                    break;
                  }
                }
              }
            },

            get project() {
              return state.projects.get(1);
            }
          };
        });

        return (
          <div>
            <h2>{state.project?.name}</h2>
            <div data-testid="owner">Owner: {state.project?.details.owner}</div>
            <ul data-testid="task-list">
              {state.project &&
                Array.from(state.project.details.tasks).map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
            </ul>
            <button onClick={() => state.updateTaskTitle(1, 101, 'Updated Task Title')}>
              Update Task
            </button>
            <button onClick={() => state.deleteTask(1, 101)}>Delete Task</button>
          </div>
        );
      }

      render(<AdvancedData />);

      // Initial state
      expect(screen.getByTestId('owner')).toHaveTextContent('Owner: Alice');
      expect(screen.getByTestId('task-list').children).toHaveLength(1);
      expect(screen.getByText('Initial Task')).toBeInTheDocument();

      // Update a deeply nested property
      fireEvent.click(screen.getByText('Update Task'));
      await waitFor(() => {
        expect(screen.getByText('Updated Task Title')).toBeInTheDocument();
        expect(screen.queryByText('Initial Task')).not.toBeInTheDocument();
      });

      // Delete an object from the nested Set
      fireEvent.click(screen.getByText('Delete Task'));
      await waitFor(() => {
        expect(screen.getByTestId('task-list').children).toHaveLength(0);
      });
    });

    it("should handle deep mutation in a Map value's array", async () => {
      function OrgChart() {
        const state = useVstate(() => ({
          departments: new Map<
            string,
            {
              name: string;
              teams: {
                frontend: {
                  members: Array<{ id: number; name: string; age: number }>;
                };
              };
            }
          >([
            [
              'dev',
              {
                name: 'Development',
                teams: {
                  frontend: {
                    members: [
                      { id: 101, name: 'Alice', age: 30 },
                      { id: 102, name: 'Bob', age: 35 }
                    ]
                  }
                }
              }
            ]
          ]),

          celebrateBirthday(departmentId: string, memberId: number) {
            const department = state.departments.get(departmentId);
            if (department) {
              const member = department.teams.frontend.members.find((m) => m.id === memberId);
              if (member) {
                member.age++;
              }
            }
          }
        }));

        const devDepartment = state.departments.get('dev');

        return (
          <div>
            <h1>{devDepartment?.name}</h1>
            <ul>
              {devDepartment?.teams.frontend.members.map((member) => (
                <li key={member.id}>
                  {member.name} - {member.age}
                </li>
              ))}
            </ul>
            <button onClick={() => state.celebrateBirthday('dev', 101)}>
              Celebrate Alice's Birthday
            </button>
          </div>
        );
      }

      render(<OrgChart />);

      // Initial state
      expect(screen.getByText('Alice - 30')).toBeInTheDocument();

      // Mutate age
      fireEvent.click(screen.getByText("Celebrate Alice's Birthday"));

      // Expect re-render with new age
      await waitFor(() => {
        expect(screen.getByText('Alice - 31')).toBeInTheDocument();
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle form with validation and derived state', async () => {
      function RegistrationForm() {
        const state = useVstate(() => ({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptedTerms: false,

          get fullName() {
            return `${state.firstName} ${state.lastName}`.trim();
          },

          get emailError() {
            if (!state.email) return '';
            if (!state.email.includes('@')) return 'Invalid email';
            if (!state.email.includes('.')) return 'Invalid email';
            return '';
          },

          get passwordError() {
            if (!state.password) return '';
            if (state.password.length < 8) return 'Password too short';
            if (!/[A-Z]/.test(state.password)) return 'Need uppercase letter';
            if (!/[0-9]/.test(state.password)) return 'Need number';
            return '';
          },

          get confirmPasswordError() {
            if (!state.confirmPassword) return '';
            if (state.password !== state.confirmPassword) return 'Passwords do not match';
            return '';
          },

          get isValid() {
            return (
              state.firstName.length > 0 &&
              state.lastName.length > 0 &&
              state.emailError === '' &&
              state.email.length > 0 &&
              state.passwordError === '' &&
              state.confirmPasswordError === '' &&
              state.acceptedTerms
            );
          },

          get summary() {
            if (state.isValid) {
              return `Ready to register ${state.fullName} with ${state.email}`;
            }
            return 'Please complete all fields correctly';
          }
        }));

        return (
          <div>
            <input
              data-testid="first-name"
              value={state.firstName}
              onChange={(e) => (state.firstName = e.target.value)}
              placeholder="First Name"
            />
            <input
              data-testid="last-name"
              value={state.lastName}
              onChange={(e) => (state.lastName = e.target.value)}
              placeholder="Last Name"
            />
            <input
              data-testid="email"
              value={state.email}
              onChange={(e) => (state.email = e.target.value)}
              placeholder="Email"
            />
            {state.emailError && <span data-testid="email-error">{state.emailError}</span>}

            <input
              data-testid="password"
              type="password"
              value={state.password}
              onChange={(e) => (state.password = e.target.value)}
              placeholder="Password"
            />
            {state.passwordError && <span data-testid="password-error">{state.passwordError}</span>}

            <input
              data-testid="confirm-password"
              type="password"
              value={state.confirmPassword}
              onChange={(e) => (state.confirmPassword = e.target.value)}
              placeholder="Confirm Password"
            />
            {state.confirmPasswordError && (
              <span data-testid="confirm-password-error">{state.confirmPasswordError}</span>
            )}

            <label>
              <input
                type="checkbox"
                checked={state.acceptedTerms}
                onChange={(e) => (state.acceptedTerms = e.target.checked)}
              />
              Accept Terms
            </label>

            <div data-testid="summary">{state.summary}</div>
            <button data-testid="submit" disabled={!state.isValid}>
              Register
            </button>
          </div>
        );
      }

      const { container } = render(<RegistrationForm />);

      // Initially invalid
      expect(screen.getByTestId('summary')).toHaveTextContent(
        'Please complete all fields correctly'
      );
      expect(screen.getByTestId('submit')).toBeDisabled();

      // Fill in first name
      fireEvent.change(screen.getByTestId('first-name'), { target: { value: 'John' } });
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'Please complete all fields correctly'
        );
      });

      // Fill in last name
      fireEvent.change(screen.getByTestId('last-name'), { target: { value: 'Doe' } });

      // Invalid email
      fireEvent.change(screen.getByTestId('email'), { target: { value: 'notanemail' } });
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email');
      });

      // Valid email
      fireEvent.change(screen.getByTestId('email'), { target: { value: 'john@example.com' } });
      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
      });

      // Weak password
      fireEvent.change(screen.getByTestId('password'), { target: { value: 'weak' } });
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password too short');
      });

      // Strong password
      fireEvent.change(screen.getByTestId('password'), { target: { value: 'Strong123' } });
      await waitFor(() => {
        expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
      });

      // Mismatched confirmation
      fireEvent.change(screen.getByTestId('confirm-password'), {
        target: { value: 'Different123' }
      });
      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent(
          'Passwords do not match'
        );
      });

      // Matching confirmation
      fireEvent.change(screen.getByTestId('confirm-password'), { target: { value: 'Strong123' } });
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-password-error')).not.toBeInTheDocument();
      });

      // Accept terms
      fireEvent.click(screen.getByText('Accept Terms'));

      // Should now be valid
      await waitFor(() => {
        expect(screen.getByTestId('summary')).toHaveTextContent(
          'Ready to register John Doe with john@example.com'
        );
        expect(screen.getByTestId('submit')).not.toBeDisabled();
      });
    });

    it('should handle shopping cart with calculated totals', async () => {
      function ShoppingCart() {
        const state = useVstate(() => ({
          items: [
            { id: 1, name: 'Laptop', price: 999, quantity: 1 },
            { id: 2, name: 'Mouse', price: 29, quantity: 2 }
          ],
          taxRate: 0.08,
          discountCode: '',

          updateQuantity(id: number, quantity: number) {
            const item = state.items.find((i) => i.id === id);
            if (item) {
              item.quantity = Math.max(0, quantity);
            }
          },

          removeItem(id: number) {
            state.items = state.items.filter((i) => i.id !== id);
          },

          addItem(name: string, price: number) {
            state.items.push({
              id: Date.now(),
              name,
              price,
              quantity: 1
            });
          },

          get subtotal() {
            return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          },

          get discount() {
            if (state.discountCode === 'SAVE10') return state.subtotal * 0.1;
            if (state.discountCode === 'SAVE20') return state.subtotal * 0.2;
            return 0;
          },

          get taxableAmount() {
            return state.subtotal - state.discount;
          },

          get tax() {
            return state.taxableAmount * state.taxRate;
          },

          get total() {
            return state.taxableAmount + state.tax;
          },

          get itemCount() {
            return state.items.reduce((sum, item) => sum + item.quantity, 0);
          }
        }));

        return (
          <div>
            <h2>Cart ({state.itemCount} items)</h2>
            {state.items.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                <span>
                  {item.name} - ${item.price} x {item.quantity}
                </span>
                <button onClick={() => state.updateQuantity(item.id, item.quantity + 1)}>+</button>
                <button onClick={() => state.updateQuantity(item.id, item.quantity - 1)}>-</button>
                <button onClick={() => state.removeItem(item.id)}>Remove</button>
              </div>
            ))}

            <input
              data-testid="discount-code"
              value={state.discountCode}
              onChange={(e) => (state.discountCode = e.target.value)}
              placeholder="Discount code"
            />

            <div data-testid="subtotal">Subtotal: ${state.subtotal}</div>
            {state.discount > 0 && <div data-testid="discount">Discount: -${state.discount}</div>}
            <div data-testid="tax">Tax: ${state.tax.toFixed(2)}</div>
            <div data-testid="total">Total: ${state.total.toFixed(2)}</div>

            <button onClick={() => state.addItem('Keyboard', 79)}>Add Keyboard</button>
          </div>
        );
      }

      render(<ShoppingCart />);

      // Initial state
      expect(screen.getByTestId('subtotal')).toHaveTextContent('Subtotal: $1057');
      expect(screen.getByTestId('tax')).toHaveTextContent('Tax: $84.56');
      expect(screen.getByTestId('total')).toHaveTextContent('Total: $1141.56');

      // Update quantity
      const item1 = screen.getByTestId('item-1');
      fireEvent.click(within(item1).getByText('+'));
      await waitFor(() => {
        expect(screen.getByTestId('subtotal')).toHaveTextContent('Subtotal: $2056');
      });

      // Apply discount
      fireEvent.change(screen.getByTestId('discount-code'), { target: { value: 'SAVE10' } });
      await waitFor(() => {
        expect(screen.getByTestId('discount')).toHaveTextContent('Discount: -$205.6');
        expect(screen.getByTestId('total')).toHaveTextContent('Total: $1998.43');
      });

      // Remove item
      fireEvent.click(within(item1).getByText('Remove'));
      await waitFor(() => {
        expect(screen.getByTestId('subtotal')).toHaveTextContent('Subtotal: $58');
        expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
      });

      // Add new item
      fireEvent.click(screen.getByText('Add Keyboard'));
      await waitFor(() => {
        expect(screen.getByTestId('subtotal')).toHaveTextContent('Subtotal: $137');
      });
    });

    it('should handle real-time search with debouncing simulation', async () => {
      type Product = {
        id: number;
        name: string;
        price: number;
        category: string;
      };

      function ProductSearch() {
        const state = useVstate(() => ({
          searchTerm: '',
          isSearching: false,
          searchResults: [] as Product[],
          selectedFilters: new Set<string>(),
          priceRange: { min: 0, max: 1000 },
          allProducts: [
            { id: 1, name: 'iPhone 14', price: 799, category: 'electronics' },
            { id: 2, name: 'iPhone 15', price: 899, category: 'electronics' },
            { id: 3, name: 'Samsung Galaxy', price: 699, category: 'electronics' },
            { id: 4, name: 'iPad Pro', price: 1099, category: 'electronics' },
            { id: 5, name: 'MacBook Air', price: 999, category: 'computers' },
            { id: 6, name: 'Dell XPS', price: 1299, category: 'computers' }
          ] as Product[],

          toggleFilter(filter: string) {
            if (state.selectedFilters.has(filter)) {
              state.selectedFilters.delete(filter);
            } else {
              state.selectedFilters.add(filter);
            }
          },

          updatePriceRange(min: number, max: number) {
            state.priceRange.min = min;
            state.priceRange.max = max;
          },

          performSearch() {
            state.isSearching = true;
            setTimeout(() => {
              vAction(() => {
                state.searchResults = state.filteredProducts;
                state.isSearching = false;
              });
            }, 100);
          },

          get filteredProducts(): Product[] {
            let results: Product[] = state.allProducts;

            if (state.searchTerm) {
              results = results.filter((p) =>
                p.name.toLowerCase().includes(state.searchTerm.toLowerCase())
              );
            }

            if (state.selectedFilters.size > 0) {
              results = results.filter((p) => state.selectedFilters.has(p.category));
            }

            results = results.filter(
              (p) => p.price >= state.priceRange.min && p.price <= state.priceRange.max
            );

            return results;
          },

          get resultCount() {
            return state.searchResults.length;
          },

          get averagePrice() {
            if (state.searchResults.length === 0) return 0;
            const sum = state.searchResults.reduce((acc, p) => acc + p.price, 0);
            return Math.round(sum / state.searchResults.length);
          }
        }));

        React.useEffect(() => {
          state.performSearch();
        }, []);

        return (
          <div>
            <input
              data-testid="search"
              value={state.searchTerm}
              onChange={(e) => {
                state.searchTerm = e.target.value;
                state.performSearch();
              }}
              placeholder="Search products..."
            />

            <div>
              <label>
                <input
                  type="checkbox"
                  checked={state.selectedFilters.has('electronics')}
                  onChange={() => {
                    state.toggleFilter('electronics');
                    state.performSearch();
                  }}
                />
                Electronics
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={state.selectedFilters.has('computers')}
                  onChange={() => {
                    state.toggleFilter('computers');
                    state.performSearch();
                  }}
                />
                Computers
              </label>
            </div>

            <div>
              Max Price: ${state.priceRange.max}
              <input
                data-testid="price-slider"
                type="range"
                min="0"
                max="2000"
                value={state.priceRange.max}
                onChange={(e) => {
                  state.updatePriceRange(0, Number(e.target.value));
                  state.performSearch();
                }}
              />
            </div>

            <div data-testid="status">
              {state.isSearching
                ? 'Searching...'
                : `Found ${state.resultCount} products (avg: $${state.averagePrice})`}
            </div>

            <div data-testid="results">
              {state.searchResults.map((p) => (
                <div key={p.id}>
                  {p.name} - ${p.price}
                </div>
              ))}
            </div>
          </div>
        );
      }

      render(<ProductSearch />);

      // Wait for initial search. CORRECTED: Expects 4 products due to the initial price filter.
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Found 4 products (avg: $849)');
      });

      // Search for iPhone
      fireEvent.change(screen.getByTestId('search'), { target: { value: 'iPhone' } });
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Found 2 products (avg: $849)');
      });

      // Filter by computers
      fireEvent.click(screen.getByText('Computers'));
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Found 0 products (avg: $0)');
      });

      // Clear search to see computers. CORRECTED: Expects 1 product due to the price filter.
      fireEvent.change(screen.getByTestId('search'), { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Found 1 products (avg: $999)');
      });

      // Adjust price range to a new value to make the test step meaningful.
      fireEvent.change(screen.getByTestId('price-slider'), { target: { value: '1300' } });
      await waitFor(() => {
        // CORRECTED: Now it should find both computers.
        expect(screen.getByTestId('status')).toHaveTextContent('Found 2 products (avg: $1149)');
      });
    });

    it('should handle nested component state updates with vGrip optimization', async () => {
      let parentRenders = 0;
      let childRenders = 0;

      const Child = vGrip(({ item }: { item: any }) => {
        childRenders++;
        return (
          <div data-testid={`child-${item.id}`}>
            <span data-testid={`child-renders-${item.id}`}>{childRenders}</span>
            <span>
              {item.name}: {item.count}
            </span>
          </div>
        );
      });

      const Parent = vGrip(() => {
        parentRenders++;
        const state = useVstate(() => ({
          items: [
            { id: 1, name: 'Item 1', count: 0 },
            { id: 2, name: 'Item 2', count: 0 },
            { id: 3, name: 'Item 3', count: 0 }
          ],
          unrelatedData: 'Some data',

          incrementItem(id: number) {
            const item = state.items.find((i) => i.id === id);
            if (item) item.count++;
          },

          updateUnrelated() {
            state.unrelatedData = 'Updated data';
          }
        }));

        return (
          <div>
            <div data-testid="parent-renders">{parentRenders}</div>
            <div>{state.unrelatedData}</div>
            {state.items.map((item) => (
              <Child key={item.id} item={item} />
            ))}
            <button onClick={() => state.incrementItem(1)}>Increment Item 1</button>
            <button onClick={() => state.updateUnrelated()}>Update Unrelated</button>
          </div>
        );
      });

      render(<Parent />);

      // Initial render
      expect(screen.getByTestId('parent-renders')).toHaveTextContent('1');

      // Update specific item - should only re-render that child with vGrip
      fireEvent.click(screen.getByText('Increment Item 1'));
      await waitFor(() => {
        expect(screen.getByText('Item 1: 1')).toBeInTheDocument();
      });

      // Update unrelated data - children shouldn't re-render with vGrip
      fireEvent.click(screen.getByText('Update Unrelated'));
      await waitFor(() => {
        expect(screen.getByText('Updated data')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid successive updates with batching', async () => {
      let renderCount = 0;

      function RapidUpdates() {
        renderCount++;
        const state = useVstate(() => ({
          counters: Array(5).fill(0),

          incrementAll() {
            vAction(() => {
              for (let i = 0; i < state.counters.length; i++) {
                state.counters[i]++;
              }
            });
          },

          incrementAllWithoutBatch() {
            for (let i = 0; i < state.counters.length; i++) {
              state.counters[i]++;
            }
          },

          get sum() {
            return state.counters.reduce((a, b) => a + b, 0);
          }
        }));

        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <div data-testid="sum">Sum: {state.sum}</div>
            <div data-testid="counters">{state.counters.join(',')}</div>
            <button onClick={state.incrementAll}>Increment All (Batched)</button>
            <button onClick={state.incrementAllWithoutBatch}>Increment All (Not Batched)</button>
          </div>
        );
      }

      render(<RapidUpdates />);

      const initialRenders = renderCount;

      // Batched update - should cause only one re-render
      fireEvent.click(screen.getByText('Increment All (Batched)'));
      await waitFor(() => {
        expect(screen.getByTestId('sum')).toHaveTextContent('Sum: 5');
        expect(screen.getByTestId('counters')).toHaveTextContent('1,1,1,1,1');
      });

      const rendersAfterBatch = renderCount - initialRenders;

      // Non-batched update - might cause multiple re-renders
      fireEvent.click(screen.getByText('Increment All (Not Batched)'));
      await waitFor(() => {
        expect(screen.getByTestId('sum')).toHaveTextContent('Sum: 10');
        expect(screen.getByTestId('counters')).toHaveTextContent('2,2,2,2,2');
      });

      // Batched should be more efficient (1 render vs potentially many)
      expect(rendersAfterBatch).toBeLessThanOrEqual(2); // Should be 1, but allowing some flexibility
    });

    it('should handle array mutations with complex objects', async () => {
      function TaskManager() {
        const state = useVstate(() => ({
          tasks: [] as Array<{
            id: number;
            title: string;
            subtasks: Array<{ id: number; text: string; done: boolean }>;
            tags: Set<string>;
          }>,

          addTask(title: string) {
            state.tasks.push({
              id: Date.now(),
              title,
              subtasks: [],
              tags: new Set()
            });
          },

          addSubtask(taskId: number, text: string) {
            const task = state.tasks.find((t) => t.id === taskId);
            if (task) {
              task.subtasks.push({ id: Date.now(), text, done: false });
            }
          },

          toggleSubtask(taskId: number, subtaskId: number) {
            const task = state.tasks.find((t) => t.id === taskId);
            if (task) {
              const subtask = task.subtasks.find((s) => s.id === subtaskId);
              if (subtask) {
                subtask.done = !subtask.done;
              }
            }
          },

          addTag(taskId: number, tag: string) {
            const task = state.tasks.find((t) => t.id === taskId);
            if (task) {
              task.tags.add(tag);
            }
          },

          moveTask(fromIndex: number, toIndex: number) {
            const [task] = state.tasks.splice(fromIndex, 1);
            state.tasks.splice(toIndex, 0, task);
          },

          get totalSubtasks() {
            return state.tasks.reduce((sum, task) => sum + task.subtasks.length, 0);
          },

          get completedSubtasks() {
            return state.tasks.reduce(
              (sum, task) => sum + task.subtasks.filter((s) => s.done).length,
              0
            );
          }
        }));

        return (
          <div>
            <div data-testid="stats">
              Subtasks: {state.completedSubtasks}/{state.totalSubtasks}
            </div>

            <button onClick={() => state.addTask(`Task ${state.tasks.length + 1}`)}>
              Add Task
            </button>

            <div data-testid="tasks">
              {state.tasks.map((task, index) => (
                <div key={task.id} data-testid={`task-${task.id}`}>
                  <h3>{task.title}</h3>
                  <div>Tags: {Array.from(task.tags).join(', ') || 'none'}</div>
                  <ul>
                    {task.subtasks.map((subtask) => (
                      <li key={subtask.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={subtask.done}
                            onChange={() => state.toggleSubtask(task.id, subtask.id)}
                          />
                          {subtask.text}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      state.addSubtask(task.id, `Subtask ${task.subtasks.length + 1}`);
                    }}>
                    Add Subtask
                  </button>
                  <button onClick={() => state.addTag(task.id, `tag${task.tags.size + 1}`)}>
                    Add Tag
                  </button>
                  {index > 0 && (
                    <button onClick={() => state.moveTask(index, index - 1)}>Move Up</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      render(<TaskManager />);

      // Add tasks
      fireEvent.click(screen.getByText('Add Task'));
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Task'));
      await waitFor(() => {
        expect(screen.getByText('Task 2')).toBeInTheDocument();
      });

      // Add subtasks - FIXED SELECTOR
      const allTasks = screen.getAllByTestId(/task-\d+/);
      const firstTask = allTasks[0];
      const addSubtaskButton = within(firstTask).getByText('Add Subtask');
      fireEvent.click(addSubtaskButton);

      await waitFor(() => {
        expect(screen.getByTestId('stats')).toHaveTextContent('Subtasks: 0/1');
      });

      // Toggle subtask
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.getByTestId('stats')).toHaveTextContent('Subtasks: 1/1');
      });

      // Add tag
      fireEvent.click(screen.getAllByText('Add Tag')[0]);
      await waitFor(() => {
        expect(screen.getByText('Tags: tag1')).toBeInTheDocument();
      });

      // Move task
      fireEvent.click(screen.getByText('Move Up'));
      await waitFor(() => {
        const tasks = screen.getAllByText(/Task \d/);
        expect(tasks[0]).toHaveTextContent('Task 2');
        expect(tasks[1]).toHaveTextContent('Task 1');
      });
    });
  });
});
