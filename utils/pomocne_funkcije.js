const { Pool, Client } = require('pg');
const express = require("express");
var router = express.Router();

const pool = new Pool({
    user: 'fnjhtzwd',
    host: 'abul.db.elephantsql.com',
    database: 'fnjhtzwd',
    password: 'snYNJNPKQkz4QoWUuXokO7DAiG8sw9uA',
    port: 5432,
    max : 100,
    idleTimeoutMillis: 30000
});


pomocna = {
    getKorisnik :  function (req,res,next) {
        pool.query(`SELECT * FROM KORISNIK WHERE ID = $1`,[req.session.korisnik_id],(err,result) => {
            if (err) {
                console.info(err);
                return res.sendStatus(500);
            }

            if ( req.session.tip === "trgovac") {
                pool.query(`SELECT * FROM TRGOVAC WHERE ID = $1`, [req.session.korisnik_id], (err,result) => {
                    if (err) {
                        console.log(err);
                        return res.sendStatus(500);
                    }
                    req.korisnik =  result.rows;
                    console.info(req.korisnik);

                    next();

                })
            }
            else if ( req.session.tip === "kupac") {
                pool.query(`SELECT * FROM KUPAC WHERE ID = $1`, [req.session.korisnik_id], (err,result) => {
                    if (err) {
                        console.log(err);
                        return res.sendStatus(500);
                    }
                    req.korisnik = result.rows;

                    next();

                })
            }
            else { // admin
                req.korisnik = result.rows;
                next();
            }
        })
    },

    getArtikli : function (req,res,next) { //
        // svi artikli kojima je dostupna kolicina > 0,
        // poredani prvo po broju prodaja pa onda po prosjecnoj ocjeni
        pool.query(`SELECT *,AK.*,ARTIKAL.ID AS ARTIKAL_ID,KATEGORIJE.NAZIV AS KATEGORIJA_NAZIV,ARTIKAL.NAZIV AS ARTIKAL_NAZIV FROM ARTIKAL 
        INNER JOIN KATEGORIJE ON ARTIKAL.KATEGORIJA = KATEGORIJE.ID
        LEFT JOIN (SELECT ARTIKAL_ID,
        COUNT(ARTIKAL_ID) AS BROJ_OCJENA, SUM(OCJENA) SUMA_OCJENA
        FROM ARTIKAL_OCJENE  group by artikal_id)AS AK ON ARTIKAL.ID = AK.ARTIKAL_ID  
        WHERE DOSTUPNA_KOLICINA > 0 ORDER BY BROJ_PRODAJA DESC,(AK.SUMA_OCJENA/AK.BROJ_OCJENA) DESC;`, [], (err, result) => {
            if (err) {
                console.info(err)
                return res.redirect("/home");
            }
            req.artikli = result.rows;
            next();
        })
    },
    getArtikliFilter : function (req,res,next) {
        let upit = `SELECT *,ARTIKAL.ID AS ARTIKALID,ARTIKAL.NAZIV AS ARTIKAL_NAZIV FROM ARTIKAL INNER JOIN TRGOVAC ON TRGOVAC_ID = TRGOVAC.ID   `

        let mincijena = 0;
        let maxcijena = 0;
        let grad;

        // ako dolazi sa rute trgovca:
        if (req.params.id) {  upit += `AND TRGOVAC_ID = `+req.params.id};

        let sortiraj = ' ORDER BY  BROJ_PRODAJA DESC'
            if (req.query.kategorija  ) { upit  += ` AND KATEGORIJA = ` +req.query.kategorija+` `}
            if (req.query.mincijena > 0) { mincijena = parseInt(req.query.mincijena);}
            if (req.query.maxcijena > 0 && parseInt(req.query.maxcijena) >= mincijena) { maxcijena = parseInt(req.query.maxcijena);}
            if ( req.query.grad) { upit += `AND GRAD= '`+req.query.grad+`'`}
            if ( req.query.sortiranje === "novi") { sortiraj = ` ORDER BY VRIJEME_DODAVANJA DESC`}
            else if ( req.query.sortiranje === "stari") { sortiraj = ` ORDER BY VRIJEME_DODAVANJA ASC`}
            else if (req.query.sortiranje === "najnize") { sortiraj = ` ORDER BY CIJENA ASC`}
            else if ( req.query.sortiranje === "najvise") { sortiraj = ` ORDER BY CIJENA DESC`};

        upit += ` AND CIJENA >= `+mincijena;
        if (maxcijena !== 0) { upit += ` AND CIJENA <= `+maxcijena}
        upit += sortiraj;
        console.info('UPIT',upit);
        pool.query(upit,[],(err,result) => {
            req.artikli_filter = result.rows;
            //console.info(result);
            next();
        })
    },
    getSviTrgovci : function (req,res,next) {
        pool.query(`SELECT * FROM TRGOVAC X INNER JOIN KORISNIK K ON X.ID = K.ID`, [], (err, result) => {
            if (err) {
                console.info(err)
            }
            req.trgovci = result.rows;
            next();
        })
    },
    getSviKupci : function (req,res,next) {
        pool.query(`SELECT * FROM KUPAC X INNER JOIN KORISNIK K ON X.ID = K.ID`, [], (err, result) => {
            if (err) {
                console.info(err)
            }
            req.kupci = result.rows;
            next();
        })
    },
    getKategorije : function (req,res,next) {
        pool.query(`SELECT * FROM KATEGORIJE`, [], (err, result) => {
            if (err) {
                console.info(err)
            }
            req.kategorije = result.rows;
            next();
        })

    },
    getDodatneInfoKategorija : function (req,res,next) {
        pool.query(`SELECT * FROM KATEGORIJA_STAVKA WHERE KATEGORIJA_ID = $1`, [req.body.kategorija_id], (err, result) => {
            if (err) {
                console.info(err)
            }
            req.kategorije_dodatne_info = result.rows;
            next();
        })

    }

}
module.exports = pomocna;