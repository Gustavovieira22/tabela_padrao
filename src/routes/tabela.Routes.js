import express from "express";

import { tela_upload_tabela } from "../controller/tabela.Controller.js";

const router = express.Router();

// Tela principal na raiz
router.get('/', tela_upload_tabela);

// Qualquer outra rota volta para a raiz
router.use((req, res) => {
    res.redirect('/');
});

export default router;