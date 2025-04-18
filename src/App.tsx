// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PizzaCanvas from './pages/PizzaCanvas';
import Test from './pages/Test';

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
