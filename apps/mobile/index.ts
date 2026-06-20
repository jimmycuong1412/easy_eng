// Register @easyeng/core adapters before anything else imports core hooks.
import './src/lib/core-bootstrap';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
