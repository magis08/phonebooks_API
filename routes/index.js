var express = require('express');
var router = express.Router();
const models = require('../models')
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize')

/* GET home page. */
router.get('/api/phonebooks', async (req, res) => {
  try {
    const { page = 1, limit = 5, keyword = '', sortBy = 'name', order = 'ASC' } = req.query;
    console.log('Request Query:', { page, limit, keyword, sortBy, order });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);

    const { count, rows } = await models.User.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${keyword}%` } },
          { phone: { [Op.iLike]: `%${keyword}%` } },
        ]       
      },
      limit: limitValue,
      offset: offset,
      order: [[sortBy, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']],
    });

    const totalPage = Math.ceil(count / limitValue);

    const phonebooks = rows.map((user) => user.dataValues);

    res.json({
      phonebooks,
      page: parseInt(page),
      limit: limitValue,
      pages: totalPage,
      total: count,
    });
  } catch (err) {
    console.error('Error in GET /api/phonebooks:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/api/phonebooks', async (req, res, next) => {
  try {
    const { name, phone } = req.body
    const user = await models.User.create({
      name, phone
    })
    res.json(user)
  } catch (err) {
    console.log(err)
  }
});

router.put('/api/phonebooks/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const { name, phone } = req.body
    const user = await models.User.update({ name, phone }, { where: { id }, returning: true })
    res.json(user)
  } catch (err) {
    console.log(err)
  }
})

router.delete('/api/phonebooks/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const user = await models.User.findOne({ where: { id } })

    if (user.avatar) {
      const avatarPath = path.join(__dirname, '../public/images', user.avatar)

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath)
      }
    }
    await models.User.destroy({ where: { id } })

    res.json({ user })
  } catch (err) {
    console.log(err)
  }
})

router.put('/api/phonebooks/:id/avatar', async (req, res) => {
  try {
    const file = req.files.avatar
    const uniqueFileName = Date.now() + '-' + file.name
    const imagesDir = path.join(__dirname, '../public/images')
    const filePath = path.join(imagesDir, uniqueFileName)

    const user = await models.User.findByPk(req.params.id)
    const oldAvatarPath = user.avatar ? path.join(imagesDir, user.avatar) : null

    file.mv(filePath, async (err) => {
      if (err) {
        return res.status(500).send(err)
      }
      if (oldAvatarPath && fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath)
      }

      user.avatar = uniqueFileName
      await user.save()

      res.json({ user, 
        avatarUrl: `http://localhost:3000/images/${uniqueFileName}?timestamp=${Date.now()}`
       })
    })

  } catch (err) {
    console.log(err)
  }
})

module.exports = router;
