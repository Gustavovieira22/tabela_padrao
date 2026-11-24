import 'dotenv/config';
import express from 'express';

import tabela from "./routes/tabela.Routes.js";

const PORT = process.env.PORT;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./src/public'));

app.set('view engine', 'ejs');
app.set('views', './src/views');

app.use("/", tabela);

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});