 autorizovan = {

    potrebanLogin: function(req, res, next) {
             if (req.session.korisnik_id) {
                 next();
             } else {
                 res.redirect("/home/login");
             }
         },
     potrebanTrgovacLogin : function (req,res,next) { // za rute na koje smije samo trgovac uci
         if (req.session.korisnik_id && req.session.tip === "trgovac") {
             next();
         } else {
             res.redirect("/home/login");
         }
     },
     potrebanKupacLogin : function (req,res,next) {
         if (req.session.korisnik_id && req.session.tip === "kupac") {
             next();
         } else {
             res.redirect("/home/login");
         }
     },
     potrebanAdminLogin : function (req,res,next) {
        if ( req.session.korisnik_id && req.session.tip === "admin") {
            next();
        }
        else {
            res.redirect("/admin/login")
        }
     }
 }
 module.exports = autorizovan;
