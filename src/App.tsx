// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PizzaCanvas from './components/PizzaCanvas';
import Test from './components/Test';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PizzaCanvas />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </Router>
  );
}

export default App;
