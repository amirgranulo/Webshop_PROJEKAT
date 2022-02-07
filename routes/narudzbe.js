var express = require('express');
var router = express.Router();
var format = require('pg-format');
//const {parse} = require("nodemon/lib/cli");
const pool = require('../utils/baza');
var _ = require('underscore');
let nodemailer = require('nodemailer');


obj = {
    napraviOrder: function (req, res, next) {
        let orders = req.body.orders;
        orders = JSON.parse(orders);
        let artikli = []; // za id artikala upravo narucenih , da se obrisu iz korpe
        let order_items = [];
        let orders_insert = [];
        for (let k = 0; k < orders.length; k++) {
            orders_insert.push([3, req.body.kupac_id, parseInt(orders[k].trgovac_id)]);

        }
        pool.query(format(`INSERT INTO ORDERS (STATUS_ID,KUPAC_ID,TRGOVAC_ID) VALUES %L RETURNING ID`, orders_insert), [],
            (err, result) => {
                if (err) {
                    console.info(err);
                }
                req.order_ids = result.rows;
                for (let k = 0; k < result.rows.length; k++) {
                    for (let i = 0; i < orders[k].artikli.length; i++) {
                        order_items.push([req.order_ids[k].id,
                            parseInt(orders[k].artikli[i]), parseInt(orders[k].kolicine[i])]);
                        artikli.push(orders[k].artikli[i]);
                    }
                }
               // console.info('order_items', order_items);
                pool.query(format('INSERT INTO ORDER_ARTIKAL (ORDER_ID,artikal_id,KOLICINA) VALUES %L', order_items), [],
                    (err, result) => {
                        if (err) {
                            console.info(err);
                        }
                        //console.info(result);
                        pool.query(`DELETE FROM KORPA WHERE KUPAC_ID = $1 AND ARTIKAL_ID = ANY($2) `
                            , [req.body.kupac_id, artikli], (err, result) => {
                                if (err) {
                                    console.info(err);
                                }
                                next();
                            })
                    })
            });

    },
    getOrderByKupac: function (req, res, next) {
        pool.query(`SELECT * FROM ORDERS O INNER JOIN ORDER_ARTIKAL O_A ON O.ID = O_A.ORDER_ID
                    INNER JOIN ARTIKAL A ON O_A.ARTIKAL_ID = A.ID
                    INNER JOIN ORDERS_STATUS O_S ON O.STATUS_ID = O_S.ID
                    INNER JOIN TRGOVAC T ON O.TRGOVAC_ID = T.ID INNER JOIN KORISNIK K ON KUPAC_ID = K.ID
                    WHERE KUPAC_ID = $1`, [req.session.korisnik_id],
            (err, result) => {
                if (err) {
                    console.info(err);
                }
                //console.info(result);
                req.narudzbe_kupac = result.rows;
                next();
            })
    },
    obrisiOrder: function (req, res, next) {
        pool.query(`DELETE FROM ORDER_ARTIKAL WHERE ORDER_ID = $1`,
            [req.body.order_id], (err, result) => {
                if (err) {
                    console.info(err);
                }
                pool.query('DELETE FROM ORDERS WHERE ID = $1 AND STATUS_ID != 4', [req.body.order_id], (err, result) => {
                    if (err) {
                        console.info(err);
                    }
                })
                next();
            })
    },
    getOrderByTrgovac: function (req, res, next) {
        pool.query(`SELECT *,KOR2.ARHIVIRAN AS TRGOVAC_ARHIVIRAN FROM ORDERS O INNER JOIN KUPAC K ON O.KUPAC_ID = K.ID 
        INNER JOIN ORDERS_STATUS OD ON O.STATUS_ID = OD.ID 
        INNER JOIN ORDER_ARTIKAL O_A ON O.ID = O_A.ORDER_ID
        INNER JOIN ARTIKAL A ON O_A.ARTIKAL_ID = A.ID INNER JOIN KORISNIK KOR ON KUPAC_ID = KOR.ID
        INNER JOIN KORISNIK KOR2 ON O.TRGOVAC_ID =  KOR2.ID
        WHERE O.TRGOVAC_ID = $1`, [req.session.korisnik_id], (err, result) => {
            if (err) {
                console.info(err);
            }
            req.narudzbe_trgovac = result.rows;
            next();
        })
    },
    obradiOrder: function (req, res, next) { // prihvati ili odbij order
        if (req.body.odluka === "prihvati") {
            pool.query(`UPDATE ORDERS
            SET status_id = 1  WHERE ID = $1 ;`, [req.body.order_id], (err, result) => {
                if (err) {
                    console.info(err);
                }
                next();
            })
        } else if (req.body.odluka === "odbij") {
            pool.query(`UPDATE ORDERS
            SET status_id = 2 WHERE ID = $1 ;`, [req.body.order_id], (err, result) => {
                if (err) {
                    console.info(err);
                }
                next();
            })
        } else if (req.body.odluka === "isporuceno") {
            pool.query(`UPDATE ORDERS SET STATUS_ID = 4 WHERE ID = $1;`,[req.body.order_id],(err,result) => {
                if (err) { console.info(err)}
                pool.query(`UPDATE ARTIKAL AS A
                SET BROJ_PRODAJA = BROJ_PRODAJA +1,DOSTUPNA_KOLICINA = DOSTUPNA_KOLICINA - O_A.KOLICINA FROM ORDER_ARTIKAL AS O_A
                WHERE A.ID = O_A.ARTIKAL_ID  AND  O_A.ORDER_ID = $1;`,[req.body.order_id],(err,result) => {
                    if (err) { console.info(err)}
                    pool.query(`UPDATE TRGOVAC SET BROJ_ISPORUCENIH_NARUDZBI
                    = BROJ_ISPORUCENIH_NARUDZBI+1,UKUPNA_ZARADA = UKUPNA_ZARADA + $1 WHERE ID = $2`,[req.body.ukupna_cijena,req.session.korisnik_id],(err,result) => {
                        if (err) {console.info(err)}
                        next();
                    })
                })
            })
        }
    },
    ocijeniTrgovac : function (req,res,next) {
        pool.query(`INSERT INTO TRGOVAC_OCJENE(order_id,ocjena,komentar)
                    VALUES($1,$2,$3)
                    ON CONFLICT (order_id)
                    DO UPDATE SET ocjena = excluded.ocjena, komentar = excluded.komentar`,
            [req.body.order_id,req.body.rating,req.body.komentar],
            (err,result) => {
                if (err) { console.info(err)}
                next();
            })
    }

}

router.get('/',autorizovan.potrebanKupacLogin,obj.getOrderByKupac,function (req,res,next) {
    const grupisani_podaci = _.groupBy(req.narudzbe_kupac, order => order.order_id);
    res.render('narudzbe', { "podaci" : grupisani_podaci, tip : req.session.tip, id : req.session.korisnik_id});
})
router.post('/',autorizovan.potrebanKupacLogin,obj.ocijeniTrgovac,function (req,res,next) {
    console.info(req.body.order_id,req.body.rating,req.body.komentar)
    res.redirect('/profil/trgovac/'+req.body.trgovac_id); // treba rdr na taj komentar na profilu trgovca
})
router.post('/dodaj',autorizovan.potrebanKupacLogin,obj.napraviOrder, function(req, res, next) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'webshop420.2022@gmail.com',
            pass: 'webshop123'
        }
    });
    console.info("mail",req.body.kupac_email)
    let mailOptions = {
        from: 'webshop420.2022@gmail.com',
        to: req.body.kupac_email,
        subject: 'Uspjesna narudzba!',
        text: 'Uspjesno ste narucili artikle! WebShop ce vam slati email pri svakoj promjeni statusa vase narudzbe.'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.send({redirect : "/narudzbe"});

});

router.post('/obrisi',autorizovan.potrebanLogin,obj.obrisiOrder,function (req,res,next) {
    res.sendStatus(200);

});

router.get('/trgovac',autorizovan.potrebanTrgovacLogin,obj.getOrderByTrgovac ,function (req,res,next) {
    const grupisani_podaci = _.groupBy(req.narudzbe_trgovac, order => order.order_id);
    res.render('narudzbe_trgovac', {tip : req.session.tip , id : req.session.korisnik_id, podaci : grupisani_podaci})
})

router.post('/trgovac/obradi',autorizovan.potrebanTrgovacLogin,obj.obradiOrder,function (req,res,next) {
    let email_text = "";
    if (req.body.odluka === "prihvati") {
        email_text = "Vaša narudžba je upravo prihvacena od strane trgovca! " +
            "Ako ste se iz nekog razloga predomislili, još uvijek je možete  otkazati.Webshop 2022."
    }
    else if (req.body.odluka === "odbij") {
        email_text = "Vaša narudžba je nažalost odbijena od strane trgovca! Webshop 2022."
    }
    else if (req.body.odluka === "isporuceno") {
        email_text = "Vaša narudžba je isporučena! Možete ocijeniti artikle i trgovca da bi poboljšali kvalitet usluga Webshopa.Webshop 2022."
    }
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'webshop420.2022@gmail.com',
            pass: 'webshop123'
        }
    });
    console.info("mail",req.body.kupac_email)
    let mailOptions = {
        from: 'webshop420.2022@gmail.com',
        to: req.body.kupac_email,
        subject: 'Obavještenje u vezi narudžbe!',
        text: email_text
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.send({odluka : req.body.odluka, order_id : req.body.order_id});
})
module.exports = router;


