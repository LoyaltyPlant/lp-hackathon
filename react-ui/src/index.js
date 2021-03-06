import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import reduxThunk from 'redux-thunk';
import jwt_decode from 'jwt-decode';
import registerServiceWorker from './registerServiceWorker';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import io from 'socket.io-client';

import App from './containers/App';
import LogIn from './containers/LogIn';
import Team from './containers/Team';
import Station from './containers/Station';
import RewardList from './containers/RewardList';
import RewardShow from './containers/RewardShow';
import RewardQRCode from './containers/RewardQRCode';
import PrivateRoute from './containers/PrivateRoute';
import Home from './components/Home';

import reducers from './reducers/index';
import { LOG_IN_USER } from './actions/types';
import { fetchUser } from './actions/index';

const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
  applyMiddleware(reduxThunk)
);
let socket;
if (process.env.NODE_ENV === 'development') {
  window.ROOT_URL = 'http://localhost:5000';
  socket = io.connect('http://localhost:5000');
} else if (process.env.NODE_ENV === 'production') {
  window.ROOT_URL = '';
  socket = io.connect('');
}

const token = localStorage.getItem('token');
// update application state with token information if needed
if (token) {
  const user = jwt_decode(token);

  store.dispatch(fetchUser(user._id));

  store.dispatch({ type: LOG_IN_USER });
}

ReactDOM.render(
  <Provider store={store}>
    <MuiThemeProvider>
      <Router>
        <Switch>
          <PrivateRoute
            path="/station"
            component={Station}
            roles={['admin', 'manager']}
          />
          <Route path="/login" component={LogIn} />
          <App socket={socket}>
            <Switch>
              <PrivateRoute
                path="/rewards/:id/qr-code"
                component={RewardQRCode}
              />
              <PrivateRoute path="/rewards/:id" component={RewardShow} />
              <PrivateRoute path="/rewards/" component={RewardList} />
              <PrivateRoute path="/team/" component={Team} socket={socket} />
              <PrivateRoute path="/" component={Home} />
            </Switch>
          </App>
        </Switch>
      </Router>
    </MuiThemeProvider>
  </Provider>,
  document.getElementById('root')
);

registerServiceWorker();
