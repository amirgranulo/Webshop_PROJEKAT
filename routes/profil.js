var express = require('express');
var router = express.Router();
const pool = require('../utils/baza');

obj = {
    getTrgovac : function (req,res,next) {
        pool.query(`SELECT * FROM TRGOVAC WHERE ID = $1`,[req.params.id], (err,result) => {
            if (err) { console.info(err)
                return res.redirect('/home');}
            req.trgovac_podaci = result.rows[0];
            next();

        })
    },
    getKupac : function (req,res,next) {
        pool.query(`SELECT * FROM KUPAC WHERE ID = $1`,[req.params.id], (err,result) => {
            if (err) { console.info(err)
                return res.redirect('/home');}
            req.kupac_podaci = result.rows[0];
            next();

        })
    },
    getTrgovacKomentari : function (req,res,next) {
        pool.query(`SELECT * FROM TRGOVAC_OCJENE T INNER JOIN ORDERS O ON T.ORDER_ID = O.ID
        INNER JOIN KUPAC ON O.KUPAC_ID = KUPAC.ID WHERE O.TRGOVAC_ID = $1;`,[req.params.id],(err,result) => {
            if (err) { console.info(err)}
            req.trgovac_ocjene = result.rows;
            next();
        })
    },
    getBrojKupljenih : function (req,res,next) {
        pool.query(`select count(*) from order_artikal inner join orders on 
        order_artikal.order_id = orders.id where kupac_id = $1 and status_id = 4;`,[req.params.id],(err,result) => {
            if (err) {console.info(err)}
            req.broj_kupljenih = result.rows[0];
            console.info(req.broj_kupljenih)
            next();
        })
    },
    getBrojOcjena : function (req,res,next) {
        pool.query(`SELECT COUNT(*) FROM ARTIKAL_OCJENE WHERE KUPAC_ID = $1;`,[req.params.id],(err,result) => {
            if (err) {console.info(err)}
            req.broj_ocjena = result.rows[0];
            next();
        })
    }

}


router.get('/trgovac/:id',autorizovan.potrebanLogin, obj.getTrgovac,pomocna.getArtikliFilter,obj.getTrgovacKomentari,
    pomocna.getKategorije,function(req, res, next) {

    if ( req.trgovac_podaci.profilna_slika === null) { req.trgovac_podaci.profilna_slika = "default_profilna.png"}
    res.render('trgovac_profil', { tip : req.session.tip, id : req.session.korisnik_id,
        podaci : req.trgovac_podaci, artikli : req.artikli_filter,trgovac_ocjene : req.trgovac_ocjene,kategorije: req.kategorije});
});

router.get('/kupac/:id',autorizovan.potrebanLogin, obj.getKupac,obj.getBrojKupljenih,obj.getBrojOcjena,function (req,res,next) {
    if ( req.kupac_podaci.profilna_slika === null) {  req.kupac_podaci.profilna_slika = "default_profilna.png"}
    if ( req.kupac_podaci.naslovna_slika === null) { req.kupac_podaci.naslovna_slika = "default_naslovna.png"}

    res.render('kupac_profil', { tip: req.session.tip, id : req.session.korisnik_id, podaci : req.kupac_podaci,
        broj_kupljenih : req.broj_kupljenih,broj_ocjena : req.broj_ocjena})

})

module.exports = router;


