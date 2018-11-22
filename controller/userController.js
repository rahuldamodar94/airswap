var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/user');
var bcrypt = require('bcryptjs');
var config = require('../utils/config');
var smtpTransport = require('../utils/mailer');
var verifyToken = require('../middleware/verifyToken');
var handlebars = require('handlebars');
var readHTMLFile = require('../utils/readfile');
var fs = require('fs');




router.get('/', (req, res) => {
    res.json({status: 'etho'})
});

router.post('/forgotpassword', (req, res) => {
    var email = req.body.email;

    if(!email){
        return res.json({status: 404, message: "request data is incorrect"});
    } else{
        User.findOne({email: email}).then((user) => {
            var user = user;
            var redirectUrl = config.reset_password_url + jwt.sign({email : user.email}, config.jwt_secret, {expiresIn: 86400});
            readHTMLFile(__dirname + '/../templates/forgotpassword.html', function(err, html) {
                
                var template = handlebars.compile(html);
                var replacements = {
                    username: user.name,
                    redirectUrl: redirectUrl
                }
                var htmlToSend = template(replacements);
                var data = {
                    to: user.email,
                    from: config.admin_email,
                    subject: 'Password Reset Confirmation',
                    html: htmlToSend
                };
                smtpTransport.sendMail(data, function(err) {
                    if (!err) {
                        return res.json({ message: 'Password reset mail sent' });
                    }else {
                        console.log('mail send error', err);
                        return res.json({status: 400}); 
                    }
                });

            });
        }).catch((err) =>{
            return res.json({status:400, message:"Email does not exist" });
        })
    }
});


router.post('/resetpassword', verifyToken, (req, res) => {
    var email = req.email;
    var password = req.body.password;

    if(!password){
        return res.json({status: 400, message: "request object does not contain password"});
    }else if(!email){
        return res.json({status: 400, message: "token missing"});
    }else{
        var hashedPassword = bcrypt.hashSync(req.body.password);

        User.findOne({email: email}).then((user) => {
            if(user.password == hashedPassword){
                return res.json({status: 400, message: "You are entering your old password"});
            }
            user.password = hashedPassword;
            user.save().then((doc) => {
                return res.json({status: 200, message: "Password changed successfully"});
            }).catch((err) => {
                return res.json({status: 400, message: "error saving password"});
            });
        }).catch((err) => {
            return res.json({status: 400, message: "email does not exist"});
        });
    }
});

module.exports = router;