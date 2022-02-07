var express = require('express');
var router = express.Router();
const pool = require('../utils/baza');
const bcrypt = require("bcrypt");

let statistika = {

    statistikaKorisnici : function (req,res,next) {
      pool.query(`SELECT tip,count(*) AS total FROM korisnik GROUP BY tip`,[],(err,result) => {
          if (err) { console.info(err);}
          req.stats_korisnici = result.rows;
          next();
      })
    },
    statistikaStatusiNarudzbi : function (req,res,next) {
        pool.query(`SELECT status,count(*) AS total FROM ORDERS  INNER JOIN ORDERS_STATUS O_A
                    ON STATUS_ID = O_A.id GROUP BY o_a.status;`,[],(err,result) => {
            if (err) { console.info(err);}
            req.stats_statusi_artikala = result.rows;
            console.info('wtf',req.stats_statusi_artikala);
            next();
        })
    },
    statistikaBrojArtikala : function (req,res,next) { // broj artikala u zadnjih 7 dana, po svakom danu.
        pool.query(`select COUNT(*) as broj_artikala,extract(day from vrijeme_dodavanja) as dan from artikal 
                    where vrijeme_dodavanja > current_date - interval '7 days' group by dan;`,[],(err,result) => {

            if (err) { console.info(err);}
            req.stats_brojevi_artikala = result.rows;
            next();
        })
    },
    statistikaUkupnaZarada : function (req,res,next) {
        pool.query(`SELECT SUM(ukupna_zarada) FROM TRGOVAC`,[],(err,result) => {
            if (err) { console.info(err);}
            req.stats_ukupna_zarada  = result.rows[0].sum;
            next();
        })
    },
    statistikaCijenaArtikala : function (req,res,next) {
        pool.query(`SELECT AVG(cijena),MAX(cijena),MIN(cijena) FROM ARTIKAL;`,[],(err,result) => {
            if (err) { console.info(err);}
            req.stats_artikli  = result.rows[0];
            next();
        })
    },




}

router.get('/', autorizovan.potrebanAdminLogin,statistika.statistikaKorisnici,statistika.statistikaStatusiNarudzbi,
    statistika.statistikaBrojArtikala,statistika.statistikaUkupnaZarada,statistika.statistikaCijenaArtikala,
    pomocna.getSviTrgovci,pomocna.getSviKupci,pomocna.getKategorije,function(req, res, next) {

  brojac = 1; // ako ima dana da nema narudzbi length ce biti manje od 7 pa treba dodati onda dane sa 0 artikala
  while ( req.stats_brojevi_artikala.length < 7) {
        req.stats_brojevi_artikala.push({broj_artikala : 0,dan: req.stats_brojevi_artikala[req.stats_brojevi_artikala.length-1].dan+brojac})
        brojac++;
  }
  let podaci = [];
  for (let i = 0; i < req.stats_brojevi_artikala.length; i++) { podaci.push(req.stats_brojevi_artikala[i].broj_artikala)}
  console.info(podaci);


    res.render('admin', {piechart : req.stats_korisnici, barchart : req.stats_statusi_artikala,
        linechart : req.stats_brojevi_artikala,ukupna_zarada : req.stats_ukupna_zarada,stats_artikli : req.stats_artikli,
    trgovci : req.trgovci, kupci: req.kupci,kategorije : req.kategorije});
});

router.post('/',function (req,res,next) {
    if ( req.body.blokiraj_id ) {
        console.info('BLOKIRAM',req.body.blokiraj_id,req.body.vrijeme_blokiranja)
        pool.query(`UPDATE KORISNIK SET BLOK = $1 WHERE ID = $2`,[req.body.vrijeme_blokiranja,req.body.blokiraj_id],(err,result) => {
            if (err) { console.info(err)}
            console.info(result);
        })
    }

    if ( req.body.arhiviraj_id) {
        console.info('arhiviram',req.body.arhiviraj_id)
        pool.query(`UPDATE KORISNIK SET ARHIVIRAN = 1 WHERE ID = $1`,[req.body.arhiviraj_id],(err,result) => {
            if (err) { console.info(err)}
            console.info(result);
        })

    }

    if ( req.body.ponisti_id) {
        pool.query(`UPDATE KORISNIK SET ARHIVIRAN = 0 ,BLOK = '1970-01-01' WHERE ID = $1`,[req.body.ponisti_id],(err,result) => {
            if (err) { console.info(err)}
            console.info(result);
        })


    }
    if ( req.body.novo_ime) {
        if (req.body.tip_korisnika === "trgovac") {
            pool.query(`UPDATE TRGOVAC SET USERNAME = $1  WHERE ID = $2`,[req.body.novo_ime,req.body.id_korisnika],(err,result) => {
                if (err) {
                    console.info(err)
                }
                console.info(result);
            });
        }
        else {
            pool.query(`UPDATE KUPAC SET IME_I_PREZIME = $1  WHERE ID = $2`,[req.body.novo_ime,req.body.id_korisnika],(err,result) => {
                if (err) {
                    console.info(err)
                }
                console.info(result);
            });

        }

    }

    if ( req.body.naziv_kategorije) {
        pool.query(`INSERT INTO KATEGORIJE(NAZIV) VALUES ($1)`,[req.body.naziv_kategorije],(err,result) => {
            if (err) {
                console.info(err)
            }
            console.info(result);
        });

    }

    if (req.body.atribut ) {
        pool.query(`INSERT INTO KATEGORIJA_STAVKA(NAZIV,KATEGORIJA_ID,TIP)  VALUES ($1,$2,$3)`,
            [req.body.atribut,req.body.kategorija,req.body.tip],(err,result) => {
            if (err) {
                console.info(err)
            }
            console.info(result);
        });
    }

    if (req.body.uredi) {
        pool.query(`UPDATE KATEGORIJE SET NAZIV = $1 WHERE ID = $2`,[req.body.kategorija_naziv,req.body.kategorija_id],
            (err,result) => {
            if (err) {
                console.info(err)
            }
            console.info(result);
        });
    }

    else  if ( req.body.kategorija_id ) {
        pool.query(`UPDATE KATEGORIJA_STAVKA_VRIJEDNOST SET VRIJEDNOST = '',
        KATEGORIJA_ID =  (SELECT ID FROM KATEGORIJE WHERE NAZIV = 'Nema kategoriju')
        WHERE KATEGORIJA_ID = $1;`,[req.body.kategorija_id],(err,result) => {
            if (err) {
                console.info(err)
            }
            pool.query(`UPDATE KATEGORIJA_STAVKA SET NAZIV = '',
            KATEGORIJA_ID =  (SELECT ID FROM KATEGORIJE WHERE NAZIV = 'Nema kategoriju')
            WHERE KATEGORIJA_ID = $1;`,[req.body.kategorija_id],(err,result) => {
                if (err) {
                    console.info(err)
                }
                pool.query(`UPDATE ARTIKAL SET KATEGORIJA =  (SELECT ID FROM KATEGORIJE WHERE NAZIV = 'Nema kategoriju')
                WHERE KATEGORIJA = $1;`,[req.body.kategorija_id],(err,result) => {
                    if (err) {
                        console.info(err)
                    }
                    pool.query(`DELETE FROM KATEGORIJE WHERE ID = $1;`,[req.body.kategorija_id],(err,result) => {
                        if (err) {
                            console.info(err)
                        }


                    });

                });
            });

        });

    }


    res.sendStatus(200);
})

router.get('/login',  function(req, res, next) {
    if ( req.session.tip === "admin") {
        res.redirect('/admin');
    }
    else if ( req.korisnik_id ) {
        res.redirect('/home');
    }
    let poruka = "";
    if ( req.session.flag === 1) {
        poruka = "Pogresna lozinka!"
    }
    else if ( req.session.flag === 2) {
        poruka = "Ne postoji administratorski profil sa tim korisnickim imenom!"
    }
    req.session.flag = 0; // reset
    res.render('admin_login',{ poruka : poruka})
});

router.post('/login', function (req,res,next) {

    pool.query(`SELECT * FROM KORISNIK WHERE EMAIL = $1 AND TIP = 'admin' `,[req.body.username], (err,result) => {
        if (err) { console.info(err);}

        if ( result.rows.length === 0) {
            req.session.flag = 2;
            return res.redirect('/admin/login');
        }
        else {

            const verified = bcrypt.compareSync(req.body.password,result.rows[0].password ); // provjera sifre
            if ( verified) {
                req.session.korisnik_id = result.rows[0].id;
                req.session.tip = "admin"
                return res.redirect('/admin');

            }
            req.session.flag = 1;
            return res.redirect('/admin/login')

        }

    })

})
router.post('/logout',autorizovan.potrebanAdminLogin, function (req,res,next) {
    req.session.destroy();
    return res.redirect('/admin/login');
})


module.exports = router;
