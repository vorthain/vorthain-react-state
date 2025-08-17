import './App.css';

import { useVstate } from '../../src/index.ts';
import { observer, useLocalObservable } from 'mobx-react';

const VorthainPersonAge = ({ person }) => {
  return <div>Person age: {person.nested.age}</div>;
};

const VorthainPerson = ({ person }) => {
  const state = useVstate({
    get personText() {
      return person.name + ' | Age * 2 = ' + person.nested.age + ' * 2 = ' + person.nested.age * 2;
    }
  });

  return (
    <div>
      <div>{state.personText}</div>
      <VorthainPersonAge person={person} />
    </div>
  );
};

const VorthainApp = () => {
  const state = useVstate({
    person: {
      name: 'Vorthain',
      nested: {
        age: 15
      }
    }
  });

  return (
    <div>
      <h3>Vorthain</h3>
      <div>
        <button
          onClick={() => {
            state.person.nested.age = Math.floor(Math.random() * (60 - 10 + 1)) + 10;
          }}>
          Change person age
        </button>
        <button
          onClick={() => {
            new Promise((resolve) => {
              setTimeout(() => {
                resolve();
              }, 100);
            }).then(() => {
              state.person.nested.age = Math.floor(Math.random() * (60 - 10 + 1)) + 10;
            });
          }}>
          Change person age async
        </button>
      </div>
      <VorthainPerson person={state.person} />
    </div>
  );
};

const MobxPersonAge = observer(({ person }) => {
  return <div>Person age: {person.nested.age}</div>;
});

const MobxPerson = observer(({ person }) => {
  const state = useLocalObservable(() => ({
    get personText() {
      return person.name + ' | Age * 2 = ' + person.nested.age + ' * 2 = ' + person.nested.age * 2;
    }
  }));

  return (
    <div>
      <div>{state.personText}</div>
      <MobxPersonAge person={person} />
    </div>
  );
});

const MobxApp = observer(() => {
  const state = useLocalObservable(() => ({
    person: {
      name: 'MobX',
      nested: {
        age: 15
      }
    }
  }));

  return (
    <div>
      <h3>MobX</h3>
      <div>
        <button
          onClick={() => {
            state.person.nested.age = Math.floor(Math.random() * (60 - 10 + 1)) + 10;
          }}>
          Change person age
        </button>
        <button
          onClick={() => {
            new Promise((resolve) => {
              setTimeout(() => {
                resolve();
              }, 100);
            }).then(() => {
              state.person.nested.age = Math.floor(Math.random() * (60 - 10 + 1)) + 10;
            });
          }}>
          Change person age async
        </button>
      </div>
      <MobxPerson person={state.person} />
    </div>
  );
});

const App = () => {
  return (
    <div key="app">
      <VorthainApp key="vorthain" />
      <MobxApp key="mobx" />
    </div>
  );
};

export default App;
