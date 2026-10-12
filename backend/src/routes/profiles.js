const router = require('express').Router();
const c = require('../controllers/userController');
const { objectId } = require('../middleware/validate');

router.get('/:id', objectId(), c.publicProfile);

module.exports = router;
