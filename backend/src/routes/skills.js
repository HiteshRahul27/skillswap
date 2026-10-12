const router = require('express').Router();
const c = require('../controllers/skillController');
const v = require('../validators');
const { validate, objectId } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/', validate(v.skillQuery, 'query'), c.list);
router.get('/mine', requireAuth, c.mine);
router.get('/:id', objectId(), optionalAuth, c.get);
router.post('/', requireAuth, validate(v.skill.create), c.create);
router.patch('/:id', requireAuth, objectId(), validate(v.skill.update), c.update);
router.delete('/:id', requireAuth, objectId(), c.remove);

module.exports = router;
