import { useState, useRef, useEffect } from 'react';
import { makeAutoObservable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react';
import { createContext, useContext } from 'react';
import './App.css';

const useRenderCounter = (componentName) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
};

class RootStore {
  constructor() {
    makeAutoObservable(this);
    this.pumpkinStore = new PumpkinStore(this);
  }

  get pumpkinStoreNames() {
    return this.pumpkinStore.pumpkins.map((pumpkin) => pumpkin.name).join(', ');
  }

  get pumpkinStoreColors() {
    return this.pumpkinStore.pumpkins.map((pumpkin) => pumpkin.color).join(', ');
  }
}

class PumpkinStore {
  /** @param {RootStore} rootStore */
  constructor(rootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
  }

  pumpkins = [
    { id: 's1', name: 'Red pumpkin', color: 'red' },
    { id: 's2', name: 'Green pumpkin', color: 'green' }
  ];

  changeFirstPumpkinNameInStoreToOrange = () => {
    this.pumpkins[0].name = 'Orange';
  };

  changeFirstPumpkinColorInStoreToViolet = () => {
    this.pumpkins[0].color = 'violet';
  };

  changeSecondPumpkinName = () => {
    if (this.pumpkins.length >= 2) {
      this.pumpkins[1].name = 'Changed Second Pumpkin';
    }
  };

  changeSecondPumpkinColor = () => {
    if (this.pumpkins.length >= 2) {
      this.pumpkins[1].color = 'purple';
    }
  };

  removeSecondPumpkin = () => {
    if (this.pumpkins.length >= 2) {
      this.pumpkins.splice(1, 1);
    }
  };
}

const store = new RootStore();

const StoreContext = createContext(store);
const useStore = () => useContext(StoreContext);

const StorePumpkin = observer(({ pumpkin }) => {
  const renderCounter = useRenderCounter('StorePumpkin' + pumpkin.id);
  const store = useStore();

  return (
    <div className="card" style={{ border: '2px solid red', margin: '5px' }}>
      <h4>
        Store Pumpkin: {pumpkin.name} | Renders: {renderCounter}
      </h4>
      <p>Color: {pumpkin.color}</p>
      <div>
        <button onClick={store.pumpkinStore.changeFirstPumpkinNameInStoreToOrange}>
          Change First Name to Orange
        </button>
        <button onClick={store.pumpkinStore.changeFirstPumpkinColorInStoreToViolet}>
          Change First Color to Violet
        </button>
        <button onClick={store.pumpkinStore.changeSecondPumpkinName}>Change Second Name</button>
        <button onClick={store.pumpkinStore.changeSecondPumpkinColor}>Change Second Color</button>
        <button onClick={store.pumpkinStore.removeSecondPumpkin}>Remove Second Pumpkin</button>
      </div>
    </div>
  );
});

const LocalPumpkin = observer(({ pumpkin, localActions }) => {
  const renderCounter = useRenderCounter('LocalPumpkin' + pumpkin.id);

  return (
    <div className="card" style={{ border: '2px solid blue', margin: '5px' }}>
      <h4>
        Local Pumpkin: {pumpkin.name} | Renders: {renderCounter}
      </h4>
      <p>Color: {pumpkin.color}</p>
      <div>
        <button onClick={localActions.changeFirstPumpkinNameInLocalToYellow}>
          Change First Local Name to Yellow
        </button>
        <button onClick={localActions.changeFirstPumpkinColorInLocalToBlack}>
          Change First Local Color to Black
        </button>
        <button onClick={localActions.changeSecondLocalPumpkinName}>
          Change Second Local Name
        </button>
        <button onClick={localActions.changeSecondLocalPumpkinColor}>
          Change Second Local Color
        </button>
        <button onClick={localActions.removeSecondPumpkin}>Remove Second Local Pumpkin</button>
      </div>
    </div>
  );
});

const PumpkinsNames = observer(({ names, changeFirstPumpkinColorInLocalToBlack }) => {
  const renderCounter = useRenderCounter('PumpkinsNames');
  return (
    <div className="card" style={{ border: '2px solid green', margin: '5px' }}>
      <h4>All pumpkins names: {names}</h4>
      <p>PumpkinsNames render counter: {renderCounter}</p>
      <button onClick={changeFirstPumpkinColorInLocalToBlack}>
        changeFirstPumpkinColorInLocalToBlack (shouldn't cause rerender of this component)
      </button>
    </div>
  );
});

const Pumpkins = observer(({ state }) => {
  const renderCounter = useRenderCounter('Pumpkins');
  const store = useStore();

  return (
    <div style={{ border: '3px solid orange', padding: '10px', margin: '5px' }}>
      <div className="card">
        <h3>Pumpkins render counter: {renderCounter}</h3>
        <p>
          This component should only re-render when the array lengths change or when
          pumpkinStoreColors changes
        </p>
        <button onClick={store.pumpkinStore.changeFirstPumpkinNameInStoreToOrange}>
          changeFirstPumpkinNameInStoreToOrange (SHOULD cause rerender - state.allPumpkinNames changed)
        </button>
        <p>Store pumpkins colors: {store.pumpkinStoreColors}</p>
        <button onClick={state.changeFirstPumpkinNameInLocalToYellow}>
          changeFirstPumpkinNameInLocalToYellow (SHOULD cause rerender - state.allPumpkinNames changed)
        </button>
        <button onClick={store.pumpkinStore.removeSecondPumpkin}>
          Remove Second Store Pumpkin (SHOULD cause rerender - array length changed)
        </button>
        <button onClick={state.removeSecondPumpkin}>
          Remove Second Local Pumpkin (SHOULD cause rerender - array length changed)
        </button>
      </div>

      <h4>Store Pumpkins:</h4>
      {store.pumpkinStore.pumpkins.map((pumpkin, idx) => {
        return <StorePumpkin key={pumpkin.id} pumpkin={pumpkin} />;
      })}

      <h4>Local Pumpkins:</h4>
      {state.localPumpkins.map((pumpkin, idx) => {
        return <LocalPumpkin key={pumpkin.id} pumpkin={pumpkin} localActions={state} />;
      })}

      <PumpkinsNames
        names={state.allPumpkinNames}
        changeFirstPumpkinColorInLocalToBlack={state.changeFirstPumpkinColorInLocalToBlack}
      />
    </div>
  );
});

const App = observer(() => {
  const renderCounter = useRenderCounter('App');
  const [count, setCount] = useState(0);
  const store = useStore();
  const state = useLocalObservable(() => ({
    localPumpkins: [
      { id: 'l1', name: 'Blue pumpkin', color: 'blue' },
      { id: 'l2', name: 'Pink pumpkin', color: 'pink' }
    ],
    get pumpkinLocalNames() {
      return state.localPumpkins.map((pumpkin) => pumpkin.name).join(', ');
    },
    get allPumpkinNames() {
      return store.pumpkinStoreNames + ', ' + state.pumpkinLocalNames;
    },
    changeFirstPumpkinNameInLocalToYellow: () => {
      state.localPumpkins[0].name = 'Yellow';
    },
    changeFirstPumpkinColorInLocalToBlack: () => {
      state.localPumpkins[0].color = 'black';
    },
    changeSecondLocalPumpkinName: () => {
      if (state.localPumpkins.length >= 2) {
        state.localPumpkins[1].name = 'Changed Second Local';
      }
    },
    changeSecondLocalPumpkinColor: () => {
      if (state.localPumpkins.length >= 2) {
        state.localPumpkins[1].color = 'orange';
      }
    },
    removeSecondPumpkin: () => {
      if (state.localPumpkins.length >= 2) {
        state.localPumpkins.splice(1, 1);
      }
    }
  }));

  return (
    <div style={{ border: '3px solid black', padding: '10px' }}>
      <h3>App renders: {renderCounter}</h3>
      <p>App should only re-render when count changes</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>

      <div className="card">
        <h4>Test Buttons (these should NOT cause App to re-render):</h4>
        <button onClick={store.pumpkinStore.changeFirstPumpkinNameInStoreToOrange}>
          Change First Store Pumpkin Name
        </button>
        <button onClick={state.changeFirstPumpkinNameInLocalToYellow}>
          Change First Local Pumpkin Name
        </button>
        <button onClick={store.pumpkinStore.changeFirstPumpkinColorInStoreToViolet}>
          Change First Store Pumpkin Color
        </button>
        <button onClick={state.changeFirstPumpkinColorInLocalToBlack}>
          Change First Local Pumpkin Color
        </button>
      </div>

      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
      <Pumpkins state={state} />
    </div>
  );
});

export default App;
