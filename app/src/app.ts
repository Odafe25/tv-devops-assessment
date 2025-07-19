import express from 'express';
import dotenv from 'dotenv';
import indexRoutes from './routes';

dotenv.config();

const app = express();

app.use(express.json());
app.use('/', indexRoutes);
app.get('/health', (_, res) => res.status(200).send('OK lets go Turbovets'));  // added health check message to say OK lets go turbovets


export default app;
