import { createRoot } from 'react-dom/client';
import LoadPlanningView from '../src/components/views/LoadPlanningView';
import '../src/index.css';

const lang = (new URLSearchParams(location.search).get('lang') || 'en') as 'en';
createRoot(document.getElementById('root')!).render(<LoadPlanningView lang={lang} />);
