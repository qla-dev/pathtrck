import { createRoot } from 'react-dom/client';
import LoadPlanningView from '../src/components/views/LoadPlanningView';
import '../src/index.css';

createRoot(document.getElementById('root')!).render(<LoadPlanningView lang="en" />);
