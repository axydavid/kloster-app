import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DinnerSystem from './components/DinnerSystem';
import WashingReservation from './components/WashingReservation';
import AdminPage from './components/AdminPage';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={Login} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/dinner" component={DinnerSystem} />
          <Route path="/washing" component={WashingReservation} />
          <Route path="/admin" component={AdminPage} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
