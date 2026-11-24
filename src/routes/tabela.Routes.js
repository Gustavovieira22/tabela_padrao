import express from "express";

import { tela_upload_tabela } from "../controller/tabela.Controller.js";

const router = express.Router();

router.get('/tabela', tela_upload_tabela);

export default router;