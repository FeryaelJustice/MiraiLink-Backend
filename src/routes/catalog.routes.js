import express from 'express';
import { getAllAnimes, getAllGames, getCities, getCountries, getProfileOptions, getRegions } from '../controllers/catalog.controller.js';

const router = express.Router();

router.get('/animes', getAllAnimes);
router.get('/games', getAllGames);
router.get('/profile-options', getProfileOptions);
router.get('/geography/countries', getCountries);
router.get('/geography/countries/:countryId/regions', getRegions);
router.get('/geography/regions/:regionId/cities', getCities);

export default router;
