var express = require('express');
var router = express.Router();
const Fuse = require('fuse.js')


router.get('/',autorizovan.potrebanLogin,pomocna.getArtikli, pomocna.getSviTrgovci,pomocna.getSviKupci,function (req, res, next) {
    //console.info('PARAMS',req.query.unos)
    const options1 = {

         findAllMatches: true,
        minMatchCharLength: 3,
        keys: ['kategorija', 'artikal_naziv','kljucne_rijeci']
    };
    const options2 = {

        findAllMatches: true,
        minMatchCharLength: 3,
        keys: ['username']
    };
    const options3 = {

        findAllMatches: true,
        minMatchCharLength: 4,
        keys: ['ime_i_prezime']
    };

    const fuse1 = new Fuse(req.artikli,options1)
    const rezultat_pretrage = fuse1.search(req.query.unos); // za artikle
    const fuse2 = new Fuse(req.trgovci,options2)
    console.info(rezultat_pretrage);
    const rezultat_pretrage2 = fuse2.search(req.query.unos) // za trgovce

    const fuse3 = new Fuse(req.kupci,options3)
    const rezultat_pretrage3 = fuse3.search(req.query.unos) // za kupce


    res.render("pretraga",{tip : req.session.tip, id : req.session.korisnik_id,artikli : rezultat_pretrage,
        unos : req.query.unos, trgovci : rezultat_pretrage2, kupci : rezultat_pretrage3});
})

module.exports = router;


