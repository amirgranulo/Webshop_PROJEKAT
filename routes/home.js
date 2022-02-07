var express = require('express');
var router = express.Router();
var fs = require('fs');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const path = require("path");
const pool = require('../utils/baza');



obj = {


}

router.get('/',autorizovan.potrebanLogin,pomocna.getArtikli,pomocna.getArtikliFilter,pomocna.getKorisnik,
    pomocna.getKategorije,function(req, res, next) {
    //console.info(req.query,'query');
    let raw_podaci = fs.readFileSync('gradovi.json');
    let gradovi = JSON.parse(raw_podaci);

    let filter_artikli = false;
    if ( Object.keys(req.query).length === 0) {req.artikli_filter = []}
    else {
        if ( req.artikli_filter.length === 0) {
            filter_artikli = true;
        }
    }
    res.render('home', { tip : req.session.tip, id : req.session.korisnik_id,artikli : req.artikli, korisnik : req.korisnik,
    artikli_filter : req.artikli_filter,filter_artikli : filter_artikli ,gradovi: gradovi,kategorije : req.kategorije});
});


router.get('/logout',function (req,res,next) {
    req.session.destroy();
    return res.redirect('/home/login');

})

router.get('/login', function(req, res, next) {
    if ( req.session.korisnik_id) { return res.redirect('/home')};
    let poruka = "";

    if ( req.session.flag === 4) {
        poruka = "Uspjesna registracija";
    }
    else if ( req.session.flag === 1) {
        poruka = "Pogresan email ili lozinka";

    }
    else if ( req.session.flag === 6) {
        poruka = "Vaš profil je blokiran trajno!"
    }
    else if ( req.session.flag === 7) {
        poruka = "Vaš profil je blokiran na 15 dana!"
    }

    res.render('login', { title: 'Webshop - Login' ,message : poruka,greske: []});
});

router.post('/login',check("email").isEmail().withMessage("Email mora biti ispravnog formata!"),
    check("password").isLength({min:6,max:24}).withMessage("Šifra mora imati između 6 i 24 karaktera")
    ,function (req,res,next) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render("login",{title:"Webshop - Login",message : '',greske : errors.array()})
            //next();
        }


    pool.query(`SELECT * FROM KORISNIK WHERE EMAIL = $1 AND TIP != 'admin'`,[req.body.email], (err,result) => {
        if (err) { console.info(err);}

       if ( result.rows.length === 0) {
            req.session.flag = 1;
            return res.redirect('/home/login');
        }
       else if (result.rows[0].blok.getFullYear() === 2099 ) { // ako je blokiran do 2099, to je trajno
           req.session.flag = 6;
           return res.redirect('/home/login');

       }
       else if (result.rows[0].blok > Date.now()) {
           req.session.flag = 7;
           console.info('datum',)
           return res.redirect('/home/login');
       }

        else {
            const verified = bcrypt.compareSync(req.body.password,result.rows[0].password ); // provjera sifre
            if ( verified) {
                req.session.email = req.body.email;
                req.session.korisnik_id = result.rows[0].id;
                req.session.tip = result.rows[0].tip;

                return res.redirect('/home');

            }
            req.session.flag = 1; // flag za pogresan email ili password
            return res.redirect('/home/login')

        }

    })

})
router.get('/register', function(req, res, next) {
    if ( req.session.korisnik_id) { return res.redirect('/home')};

    let raw_podaci = fs.readFileSync('gradovi.json');
    let gradovi = JSON.parse(raw_podaci);
    res.render('register', { title: 'Webshop - Register' ,gradovi : gradovi,greske : []});
});

router.post('/register',[
    check("username").notEmpty().withMessage("Korisnicko ime ne smije biti prazno!").isAlphanumeric()
        .withMessage("Korisnicko ime smije sadrzavati samo slova i brojeve!").isLength({min: 3}).
    withMessage("Korisnicko ime mora imati bar 3 karaktera"),
    check("email").isEmail().withMessage("Email mora biti ispravnog formata!"),
    check("password").isLength({min:6,max:24}).withMessage("Šifra mora imati bar 6 a najviše 24 karaktera!"),
    check("adresa").
        isLength({min:3}).withMessage("Adresa mora imati bar 3 karaktera!"),
    check("phone").isNumeric().withMessage("Broj telefona sadržavati samo brojeve!")
        .isMobilePhone().withMessage("Uneseni broj nije broj telefona.")
    ],
     function (req, res, next) {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            let raw_podaci = fs.readFileSync('gradovi.json');
            let gradovi = JSON.parse(raw_podaci);
            return res.render("register",{title:"Webshop - Register",gradovi : gradovi, greske : errors.array()})
            //next();
        }
    const hashedPW =  bcrypt.hashSync(req.body.password, 10)


         pool.query(`INSERT INTO KORISNIK (EMAIL,PASSWORD,TIP) VALUES ($1,$2,$3) RETURNING ID`,[req.body.email,hashedPW,'trgovac'],
             (err,result) => {
                 if (err) {
                     console.info(err);


                     let raw_podaci = fs.readFileSync('gradovi.json');
                     let gradovi = JSON.parse(raw_podaci);
                         return res.render('register', { title: 'Registracija',gradovi :gradovi,greske:[{msg : 'Vec postoji profil sa ovim emailom ili korisnickim imenom!'}]});

                 }
                 req.trgovac_id = result.rows[0].id;
                 pool.query('INSERT INTO TRGOVAC VALUES ($1,$2,$3,$4,$5,null)',[req.trgovac_id,req.body.selectgrad,
                     req.body.adresa,req.body.phone,req.body.username], (err,result) => {
                     if (err) { console.info(err);
                         return res.redirect('/home/register');
                     }
                     req.session.flag = 4;
                     return res.redirect('/home/login');
                 })
             })


});
router.post('/register/kupac', [check('kupacime').isLength({min : 4}).withMessage("Ime i prezime mora imati bar 4 slova!").notEmpty().
        withMessage("Ime i prezime ne smije biti prazno!")
        .isAlpha('sr-RS@latin',{ignore: ' '}).withMessage("Ime i prezime smije sadržavati samo slova!"), // sr-RS@latin je language code
        check("email").isEmail().withMessage("Email mora biti ispravnog formata!"),
        check("password").isLength({min:6,max:24}).withMessage("Šifra mora imati bar 6 a najviše 24 karaktera!"),
        check("interesi").isLength({max : 50}).withMessage("Unijeli ste previše interesa!").
        matches(/(^$)|(^[0-9a-zA-zšđžčć]+(,[0-9a-zA-zšđžčć]+){0,9}$)/).withMessage("Interesi nisu ispravno uneseni!")], //  express validator
        function (req,res,next) {


    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        let raw_podaci = fs.readFileSync('gradovi.json'); // potrebno da bi mogao render registera
        let gradovi = JSON.parse(raw_podaci);
        console.info(errors.array());
        return res.render("register",{title:"Webshop - Register",gradovi : gradovi, greske : errors.array()})
       // next();
    }
    const hashedPW =  bcrypt.hashSync(req.body.password, 10)
            pool.query(`INSERT INTO KORISNIK (EMAIL,PASSWORD,TIP) VALUES ($1,$2,$3) RETURNING ID`,[req.body.email,hashedPW,'kupac'],
                (err,result) => {
                    if (err) {
                        console.info(err);
                        let raw_podaci = fs.readFileSync('gradovi.json');
                        let gradovi = JSON.parse(raw_podaci);
                        return res.render('register', { title: 'Registracija',gradovi :gradovi,greske:[{msg : 'Vec postoji profil sa ovim emailom!'}]});
                    }
                    req.kupac_id = result.rows[0].id;
                    pool.query('INSERT INTO KUPAC VALUES ($1,$2,$3,null,null)',
                        [req.kupac_id,req.body.kupacime,req.body.interesi], (err,result) => {
                        if (err) {
                            console.info(err);
                            return res.redirect('/home/register');

                        }
                        req.session.flag = 4;
                        return res.redirect('/home/login');
                    })
                })

});


router.get('/profil/uredi',autorizovan.potrebanLogin,pomocna.getKorisnik,function (req, res, next) { // uredjivanje profila.

    console.info(req.korisnik);

    res.render('uredi_profil',{title:"uredi", tip :req.session.tip,id : req.session.korisnik_id ,korisnik_podaci : req.korisnik, greske : ''});

})
router.post('/profil/uredi',autorizovan.potrebanLogin,pomocna.getKorisnik,[check("interesi").matches(/(^$)|(^[0-9a-zA-zšđžčć]+(,[0-9a-zA-zšđžčć]+){0,9}$)/).
    withMessage("Interesi nisu ispravno uneseni!")],function (req,res,next) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        return res.render("uredi_profil", {title:"uredi", tip :req.session.tip,id : req.session.korisnik_id ,
            korisnik_podaci : req.korisnik, greske: errors.array()})
    }

    if ( req.body.vrsta === "interesi") {
        pool.query(`UPDATE KUPAC INTERESI SET INTERESI = $1 WHERE ID = $2`,[req.body.interesi,req.session.korisnik_id], (err,result) => {
        if (err) { console.info(err); return res.redirect('/profil/uredi')}
        })
       // next();
       return res.redirect('/profil/'+req.session.tip+"/"+req.session.korisnik_id);

    }
    else {
        if (!req.files) {
            console.info('nema fajlova');
            return res.redirect('/home/profil/uredi');
        }
        req.files.slika.name = Date.now() + req.files.slika.name;
        let kolona;
        if (req.body.vrsta === "profilna") {
            uploadPath = path.join(__dirname, '../public/images/profilne_slike/' + req.files.slika.name);
            kolona = "profilna_slika";
        } else if (req.body.vrsta === "naslovna") {
            uploadPath = path.join(__dirname, '../public/images/naslovne_slike/' + req.files.slika.name);
            kolona = "naslovna_slika";
        }
        req.files.slika.mv(uploadPath, function (err) {
            if (err) {
                console.info(err);
                return res.redirect('/home/profil/uredi');
            }
        })
        if (req.session.tip === "trgovac") {
            if (kolona === "profilna_slika") {
                pool.query('UPDATE TRGOVAC SET PROFILNA_SLIKA = $1 WHERE ID = $2', [req.files.slika.name,
                    req.session.korisnik_id], (err, result) => {
                    console.info(result);
                    if (err) {
                        console.info(err);
                    }
                    next();
                })
            }


        }
        else if (req.session.tip === "kupac") {
            if (kolona === "profilna_slika") {
                pool.query('UPDATE KUPAC SET PROFILNA_SLIKA = $1 WHERE ID = $2', [req.files.slika.name,
                    req.session.korisnik_id], (err, result) => {
                    console.info(result);
                    if (err) {
                        console.info(err);
                    }
                    next();
                })

            }
            else if (kolona === "naslovna_slika") {
                pool.query('UPDATE KUPAC SET NASLOVNA_SLIKA = $1 WHERE ID = $2', [req.files.slika.name,
                    req.session.korisnik_id], (err, result) => {
                    console.info(result);
                    if (err) {
                        console.info(err);
                    }
                    next();
                })
            }
        }
    }
    res.redirect('/profil/'+req.session.tip+"/"+req.session.korisnik_id);


})

router.get('/profil/uredi/sifra',autorizovan.potrebanLogin ,function (req,res,next) {

    if (req.session.flag === 2 ) {
        return res.render('sifra',{title:'Uredi profil',tip : req.session.tip, id : req.session.korisnik_id,message: 'Pogrešna šifra!'});

    }
    else if ( req.session.flag === 3) {
        return res.render('sifra',{title: 'Uredi profil',tip : req.session.tip, id : req.session.korisnik_id,message : 'Nove šifra i potvrda nove šifre se ne poklapa!'})
    }

    res.render('sifra',{title:'Promjena sifre',tip : req.session.tip, id : req.session.korisnik_id,message : ''});

})

router.post('/profil/uredi/sifra',autorizovan.potrebanLogin, function (req,res,next) {
    if ( req.body.novipassword !== req.body.ponovopassword) {
        req.session.flag = 3;
        return res.redirect('/home/profil/uredi/sifra');
    }
    pool.query(`SELECT * FROM KORISNIK WHERE ID = $1`,[req.session.korisnik_id],(err,result) => {
        if (err) { console.info(err);
            return res.sendStatus(500);
        }
        const trenutnasifra = bcrypt.compareSync(req.body.trenutnipassword,result.rows[0].password ); // provjera sifre
        if ( !(trenutnasifra) ) {
            req.session.flag = 2;
            return res.redirect('/home/profil/uredi/sifra');
        }

        else {
            const hashedNewPW =  bcrypt.hashSync(req.body.novipassword, 10)
            //console.info(hashedNewPW);
            pool.query(`UPDATE KORISNIK SET PASSWORD = $1 WHERE ID = $2`, [hashedNewPW, req.session.korisnik_id], (err, result) => {
                if (err) {
                    console.log(err);
                }
                console.log(result);
                next();
            });
            return res.redirect('/home/logout');
        }

    })



})
module.exports = router;

