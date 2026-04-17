import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import GamesHub from './pages/GamesHub'
import LetterConfusion from './games/LetterConfusion'
import WordCompletion from './games/WordCompletion'
import ReadingSpeed from './games/ReadingSpeed'
import MemorySequence from './games/MemorySequence'
import Dashboard from './pages/Dashboard'
import ImprovementGames from './pages/ImprovementGames'
import Results from './pages/Results'
import ChildrenPage from './pages/ChildrenPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/"           element={<><Navbar /><Home /></>} />
        <Route path="/children"   element={<><Navbar /><ChildrenPage /></>} />
        <Route path="/dashboard"  element={<><Navbar /><Dashboard /></>} />
        <Route path="/improvement" element={<><Navbar /><ImprovementGames /></>} />

        {/* Kid assessment pages */}
        <Route path="/games"                      element={<GamesHub />} />
        <Route path="/games/letter-confusion"     element={<LetterConfusion />} />
        <Route path="/games/word-completion"      element={<WordCompletion />} />
        <Route path="/games/reading-speed"        element={<ReadingSpeed />} />
        <Route path="/games/memory-sequence"      element={<MemorySequence />} />

        {/* Results page */}
        <Route path="/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  )
}
