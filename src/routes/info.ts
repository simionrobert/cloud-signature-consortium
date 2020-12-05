import express from 'express';
import { info } from '../config';

const router = express.Router();

router.post('/', function(req, res) {
  const lang = req.body.lang || 'EN';
  if (lang === 'EN' || lang === 'RO') res.json(info.lang[lang]);
  else res.json(info.lang['EN']);
});

export default router;
