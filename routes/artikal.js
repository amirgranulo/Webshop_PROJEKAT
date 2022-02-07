var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
const { check, validationResult } = require('express-validator');
const pool = require('../utils/baza');
var format = require('pg-format');

obj = {

    getArtikal: function (req, res, next) { // uzimam zbir ocjena i broj ocjena jer zelim odma update u frontendu prosjecnu ocj.
        pool.query(`SELECT *,A.ID AS ARTIKAL_ID_MAIN,A.NAZIV AS ARTIKAL_NAZIV,K.NAZIV AS KATEGORIJA_NAZIV,KS.NAZIV AS STAVKA_NAZIV,V.VRIJEDNOST AS VRIJEDNOST,KS.TIP AS TIP FROM ARTIKAL A LEFT JOIN KATEGORIJA_STAVKA KS ON A.KATEGORIJA = KS.KATEGORIJA_ID
        INNER JOIN KATEGORIJE K ON A.KATEGORIJA = K.ID
        LEFT JOIN KATEGORIJA_STAVKA_VRIJEDNOST V ON A.ID = V.ARTIKAL_ID AND KS.ID = V.KATEGORIJA_STAVKA_ID
        LEFT JOIN (SELECT ARTIKAL_ID,SUM(OCJENA) as ZBIR_OCJENA,COUNT(*) as broj_ocjena FROM ARTIKAL_OCJENE GROUP BY ARTIKAL_ID) as AK
        ON A.ID = AK.ARTIKAL_ID WHERE A.ID = $1;`, [req.params.id], (err, result) => {
            if (err) {
                console.info(err)
                return res.redirect("/home");
            }
            req.artikal = result.rows;
            console.info('artikal',req.artikal);
            pool.query(`SELECT ID,USERNAME,GRAD,ADRESA,PROFILNA_SLIKA FROM TRGOVAC WHERE ID =$1`,[req.artikal[0].trgovac_id],(err,result) => {
                if (err) {
                    return res.redirect("/home");
                }
                req.trgovac_osnovno = result.rows[0];
                next();

            })
        })
    },

    obrisiArtikal : function (req,res,next) {
        pool.query('DELETE FROM KATEGORIJA_STAVKA_VRIJEDNOST WHERE ARTIKAL_ID = $1',[req.params.id],(err,result) => {

            pool.query(`DELETE FROM ARTIKAL_OCJENE WHERE ARTIKAL_ID = $1`,[req.params.id],(err,result) => {
                if (err) {
                    console.info(err);
                }
                pool.query(`DELETE FROM KORPA WHERE ARTIKAL_ID = $1 `,[req.params.id],(err,result) => {
                    pool.query(`DELETE FROM ORDER_ARTIKAL WHERE ARTIKAL_ID = $1 `,[req.params.id],(err,result) => {
                        pool.query(`DELETE FROM ARTIKAL WHERE ID = $1 `,[req.params.id],(err,result) => {
                            next();
                        })

                    })

                })


            })
    })
    },
    ocijeniArtikal : function (req,res,next) {
        pool.query(`INSERT INTO ARTIKAL_OCJENE(artikal_id,kupac_id,ocjena)
                    VALUES($1,$2,$3)
                    ON CONFLICT (artikal_id,kupac_id)
                    DO UPDATE SET ocjena = excluded.ocjena;`,[req.params.id,req.body.kupac_id,req.body.ocjena],
            (err,result) => {
                if (err) { console.info(err)}
                next();

        })
    }

}

router.get('/prikaz/:id',autorizovan.potrebanLogin,obj.getArtikal,function(req, res, next) {


    if ( req.trgovac_osnovno.profilna_slika === null) { req.trgovac_osnovno.profilna_slika = "default_profilna.png"}
    res.render('artikal', {tip : req.session.tip,id : req.session.korisnik_id,artikal : req.artikal,
        dodatne_info : req.detalji, trgovac : req.trgovac_osnovno});
});

router.post('/prikaz/:id',autorizovan.potrebanKupacLogin,obj.ocijeniArtikal,function (req,res,next) {

    res.sendStatus(200);
})

router.post('/uredi',autorizovan.potrebanTrgovacLogin,[check('naziv').isLength({min : 3,max : 30}).
withMessage("Naziv artikla mora imati bar 3, a najviše 30 karaktera!").notEmpty().
withMessage("Naziv artikla ne smije biti prazan!"),
    check("opis").isLength({min:10,max : 50}).withMessage("Opis artikla mora imati bar 10 a najviše 50 karaktera!").notEmpty().
    withMessage("Opis artikla ne smije biti prazan!"),
    check("kolicina").isNumeric({min:1}).withMessage("Kolicina ne može biti manja od 1!")], function (req,res,next) {

    console.info(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.sendStatus(400);
    }
    console.info(req.files);

    let lista_slika = [];
    let uploadPath;
    console.info(req.files);
    if ( req.files) {
    if (req.files.dodaj_sliku.length > 1) {
        for (let i = 0; i < req.files.dodaj_sliku.length; i++) {
            req.files.dodaj_sliku[i].name = Date.now() + req.files.dodaj_sliku[i].name; // datenow je dodat da ne bi imali 2 slike sa istim imenom!
            console.info('IME', req.files.dodaj_sliku[i].name);
            lista_slika.push(req.files.dodaj_sliku[i].name);
            uploadPath = path.join(__dirname, '../public/images/slike_artikala/' + req.files.dodaj_sliku[i].name);
            // dirname je putanja od ovog fajla pa se treba vratiti nazad...
            req.files.dodaj_sliku[i].mv(uploadPath, function (err) {
                if (err) {
                    console.info(err);
                    return res.sendStatus(500);
                }
            })
        }
    } else { // ako je samo jedna slika
        req.files.dodaj_sliku.name = Date.now() + req.files.dodaj_sliku.name;
        uploadPath = path.join(__dirname, '../public/images/slike_artikala/' + req.files.dodaj_sliku.name);
        lista_slika.push(req.files.dodaj_sliku.name);
        req.files.dodaj_sliku.mv(uploadPath, function (err) {
            if (err) {
                console.info(err);
                return res.sendStatus(500);
            }
        })
    }
        lista_slika = lista_slika.toString();

    }
    else {
        lista_slika = null;
    }
    if (lista_slika !== null) {
        pool.query(`UPDATE ARTIKAL SET NAZIV = $1, OPIS = $2,CIJENA = $3,DOSTUPNA_KOLICINA = $4,
        SLIKE = CONCAT(SLIKE,',',CAST($5 AS VARCHAR)) WHERE ID = $6`,
            [req.body.naziv, req.body.opis, req.body.cijena,req.body.kolicina,lista_slika, req.body.id], (err, result) => {
                if (err) {
                    console.info(err);
                    return res.sendStatus(500);
                }
                //next();
                return res.redirect('/artikal/prikaz/'+req.body.id);

            })
    }
    else {
            pool.query(`UPDATE ARTIKAL SET NAZIV = $1, OPIS = $2,CIJENA = $3,DOSTUPNA_KOLICINA = $4  WHERE ID = $5`,
                [req.body.naziv,req.body.opis,req.body.cijena,req.body.kolicina,req.body.id],(err,result) => {
                    if (err) {
                        console.info(err);
                        return res.sendStatus(500);
                    }
                    //next();
                    return res.redirect('/artikal/prikaz/'+req.body.id);

                });
        }

    //return res.redirect('/artikal/prikaz/'+req.body.id);
});

router.post('/obrisi/:id',autorizovan.potrebanTrgovacLogin,obj.obrisiArtikal,function (req,res,next) {

    let slike_brisanje = req.body.slike_brisanje.split(',')
    try {
        for (let i = 0; i < slike_brisanje.length; i++) {
            let putanja = "/slike_artikala/"+slike_brisanje[i].trim();
            fs.unlinkSync("public/images"+putanja); // brisanje uploadovanih slika iz artikla.
        }
    }
    catch(err) {
        console.info(err);
        return res.sendStatus(500); // ako je greska u brisanju slike artikla;
    }

    res.send({redirect : "/profil/trgovac/"+req.session.korisnik_id})
})

router.get('/dodaj',autorizovan.potrebanTrgovacLogin,pomocna.getKategorije,function (req,res,next) {


    res.render('dodaj_artikal',{title: 'prodaja',tip : req.session.tip, id : req.session.korisnik_id,kategorije : req.kategorije, greske : [] })
})

router.post('/dodatne',autorizovan.potrebanTrgovacLogin,pomocna.getDodatneInfoKategorija,function (req,res,next) {

    console.info(req.kategorije_dodatne_info)


    res.send({kategorije_dodatne_info : req.kategorije_dodatne_info});

})

router.post('/dodaj',[check('naziv').isLength({min : 3,max : 30}).
withMessage("Naziv artikla mora imati bar 3, a najviše 30 karaktera!").notEmpty().
withMessage("Naziv artikla ne smije biti prazan!"),
    check("opis").isLength({min:10,max : 50}).withMessage("Opis artikla mora imati bar 10 a najviše 50 karaktera!").notEmpty().
withMessage("Opis artikla ne smije biti prazan!"),
    check("kolicina").isNumeric({min:1}).withMessage("Kolicina ne može biti manja od 1!"),
check("kljucne_rijeci").matches(/(^$)|(^[0-9a-zA-zšđžčć]+(,[0-9a-zA-zšđžčć]+){0,9}$)/).
withMessage("Interesi nisu ispravno uneseni!")],
 function (req,res,next) {


    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render("dodaj_artikal",{title:"Dodaj artikal - Webshop", tip : req.session.tip,id :req.session.korisnik_id,greske : errors.array()})
        // next();
    }


    if (!req.files) {
        return res.redirect('/dodaj');
    }
    if (req.files.slike.length > 10) {
        return res.redirect('/dodaj'); // maximalno 10 slika ,// kasnije dodati flag da obavijesti usera
    }
    let lista_slika = [];
    let uploadPath;
    console.info(req.files);
    if (req.files.slike.length > 1) {
        for (let i = 0; i < req.files.slike.length; i++) {
            req.files.slike[i].name = Date.now() + req.files.slike[i].name; // datenow je dodat da ne bi imali 2 slike sa istim imenom!
            console.info('IME', req.files.slike[i].name);
            lista_slika.push(req.files.slike[i].name);
            uploadPath = path.join(__dirname, '../public/images/slike_artikala/' + req.files.slike[i].name);
            // dirname je putanja od ovog fajla pa se treba vratiti nazad...
            req.files.slike[i].mv(uploadPath, function (err) {
                if (err) {
                    console.info(err);
                    return res.redirect('/artikal/dodaj');
                }
            })
        }
    } else { // ako je samo jedna slika
        req.files.slike.name = Date.now() + req.files.slike.name;
        uploadPath = path.join(__dirname, '../public/images/slike_artikala/' + req.files.slike.name);
        lista_slika.push(req.files.slike.name);
        req.files.slike.mv(uploadPath, function (err) {
            if (err) {
                console.info(err);
                return res.redirect('/artikal/dodaj');
            }
        })
    }

    lista_slika = lista_slika.toString();
    if ( req.body.kljucne_rijeci === '') { req.body.kljucne_rijeci = null;};
    //console.info(lista_slika);
     let osnovne_info = ["naziv","opis","cijena","kategorija","kolicina","kljucne_rijeci"];

    //console.info('rez',req.body);
      pool.query(`INSERT INTO ARTIKAL (TRGOVAC_ID,NAZIV,OPIS,CIJENA,KATEGORIJA,DOSTUPNA_KOLICINA,SLIKE,VRIJEME_DODAVANJA,KLJUCNE_RIJECI)
        VALUES ($1,$2,$3,$4,$5,$6,$7,LOCALTIMESTAMP(0),$8 ) RETURNING ID `,[
        req.session.korisnik_id,req.body.naziv,req.body.opis,req.body.cijena,parseInt(req.body.kategorija),req.body.kolicina,lista_slika,req.body.kljucne_rijeci],
        // RETURNING ID  VRACA ID ARTKILA KOJI JE POTREBAN ZA SLJEDECI KORAK
        (err, result) => {
          console.log(err, result)
            if (err) { return res.redirect('/artikal/dodaj');}
            req.artikal_id = result.rows[0].id;
            let unos_stavki = []
            for (let key in req.body) {
                if (req.body.hasOwnProperty(key)) { // prolazak kroz keyove req.body
                    if ( !osnovne_info.includes(key)) { // ako nisu oni osnovni tj . ako su oni vezani za kategoriju
                        if (Array.isArray(req.body[key])) {
                            // ako je checkbox i checkiran je bit ce [0,1] pa se mora uzeti 1
                            unos_stavki.push([req.artikal_id,parseInt(req.body.kategorija),key,req.body[key][1]]);
                        }
                        else {
                            unos_stavki.push([req.artikal_id,parseInt(req.body.kategorija),key,req.body[key]]);

                        }
                    }
                }
            }
            if (unos_stavki.length > 0) {
                pool.query(format(`INSERT INTO KATEGORIJA_STAVKA_VRIJEDNOST(ARTIKAL_ID,KATEGORIJA_ID,KATEGORIJA_STAVKA_ID,VRIJEDNOST) VALUES %L`, unos_stavki), [], (err, result) => {
                    if (err) {
                        console.info(err);
                    }
                    console.info('rezultat', result.rows);
                    return res.redirect('/artikal/prikaz/' + req.artikal_id)
                })
            }
            else {
                return res.redirect('/artikal/prikaz/' + req.artikal_id)

            }

    });


})




module.exports = router;


