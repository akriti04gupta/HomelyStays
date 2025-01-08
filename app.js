const express= require("express");
const app=express();
const mongoose = require('mongoose');
const Listing = require('./models/listing.js');
const path=require("path");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const {listingSchema, reviewSchema}=require("./schema.js");
const Review = require('./models/review.js');
const session=require("express-session");
const MongoStore=require("connect-mongo");
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local").Strategy;
const User = require('./models/user.js');

//creating a session
const store=MongoStore.create({
    mongoUrl:"mongodb+srv://akriti:AN788g9ChGxYdckP@cluster0.9yt3s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    crypto:{
        secret: "mysecretcode"
    },
    touchAfter:24*3600,
});

store.on("error",()=>{
    console.log("ERROR IN MONGO SESSION STORE",err);
});

//setting up the MongoDb
const sessionOptions={
    store : store,
    secret: "mysecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now()+ 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
    }
};

app.use(session(sessionOptions));
app.use(flash());

//authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=> {
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});

app.listen(8080,()=>{
    console.log("app is listenig");
});

//stadard code for mongo connection
main()
.then(()=>{
    console.log("connected to DB");
})
.catch((err) => console.log(err));

async function main() {
  await mongoose.connect('mongodb+srv://akriti:AN788g9ChGxYdckP@cluster0.9yt3s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
}

//standard code for ejs
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


const validateListing=(req,res,next)=>{
    const {error} = listingSchema.validate(req.body);
    if(error)
    {
        throw new ExpressError(400,error);
    }
    else
    {
        next();
    }
};

const validateReview=(req,res,next)=>{
    const {error} = reviewSchema.validate(req.body);
    if(error)
    {
        throw new ExpressError(400,error);
    }
    else
    {
        next();
    }
};

//index routing
app.get("/listings", wrapAsync(async (req,res)=>{
    const allListings=await Listing.find({})
    res.render("listings/index.ejs",{allListings});
}));

//create routing
app.get("/listings/new",(req,res)=>{
    if(!req.isAuthenticated())
    {
        req.flash("error","You must be signed-in to create new Listing");
        return res.redirect("/signup");
    }
    res.render("listings/new.ejs")
});
app.post("/listings",validateListing, wrapAsync(async (req,res)=>{
    let {title,description,image,price,country,location}=req.body.listing;
    const newListing=new Listing({title,description,image,price,country,location});
    await newListing.save();
    req.flash("success","New Listing Created!");
    res.redirect("/listings");
})
);

//edit routing 
app.get("/listings/:id/edit", wrapAsync (async(req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing)
        {
            req.flash("error","Listing you requested does not exist!");
            res.redirect("/listings");
        }
    if(!req.isAuthenticated())
    {
        req.flash("error","You must be signed-in to create new Listing");
        return res.redirect("/signup");
    }
    res.render("listings/edit.ejs",{listing})
}));

//update routing
app.put("/listings/:id",validateListing, wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let {title,description,image,price,country,location}=req.body.listing;
    if(!req.isAuthenticated())
        {
            req.flash("error","You must be signed-in to create new Listing");
           return res.redirect("/signup");
        }
    await Listing.findByIdAndUpdate(id,{title,description,image,price,country,location},{ new: true });
    req.flash("success","Listing Updated!");
    res.redirect(`/listings/${id}`);
}));

//delete routing
app.delete("/listings/:id", wrapAsync(async(req,res)=>{
    let {id}=req.params;
    if(!req.isAuthenticated())
        {
            req.flash("error","You must be signed-in to create new Listing");
           return res.redirect("/signup");
        }
    let deletedListing= await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success"," Listing Deleted!");
    res.redirect("/listings");
}));

//review routing
app.get("/listings/:id/review", wrapAsync (async(req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!req.isAuthenticated())
        {
            req.flash("error","You must be signed-in to create new Listing");
           return res.redirect("/signup");
        }
    res.render("listings/review.ejs",{listing})
}));
app.post("/listings/:id/review",validateReview, wrapAsync(async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id).populate("reviews");
    let {comment,rating}=req.body.review;
    const newReview=new Review({comment,rating,user: req.user._id});
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success","New Review Added!");
    res.redirect(`/listings/${id}`);
})
);

//delete routing for reviews
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async(req,res)=>{
    console.log("Request Params: ", req.params);
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{reviews: reviewId}});
    if(!req.isAuthenticated())
        {
           req.flash("error","You must be signed-in to create new Listing");
           return res.redirect("/signup");
        }
    let deletedReview= await Review.findByIdAndDelete(reviewId);
    console.log(deletedReview);
    req.flash("success"," Review Deleted!");
    res.redirect(`/listings/${id}`);
}));

// signup routing
app.get("/signup",(req,res)=>{
    res.render("users/signup.ejs");
});
app.post("/signup", wrapAsync(async (req,res)=>{
    try{
        let {username,email,password}=req.body;
        const newUser=new User({username,email});
        const user1=await User.register(newUser,password);
        console.log(user1);
        req.login(user1,(err)=>{
            if(err)
            {
                return next(err);
            }
        req.flash("success","Welcome to HomelyStays!");
        res.redirect("/listings");
        });
        }
        catch(e)
        {
            req.flash("error",e.message);
            res.redirect("/signup"); 
        }

}));

//login routing 
app.get("/signin",(req,res)=>{
    res.render("users/signin.ejs");
});
app.post("/signin", passport.authenticate("local",{failureRedirect:"/signin",failureFlash:true}) ,wrapAsync(async (req,res)=>{
        req.flash("success","Welcome back to HomelyStays!");
        res.redirect("/listings");
}));

//logout routing
app.get("/logout",(req,res)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
    req.flash("success","You are loggged out now!");
    res.redirect("/listings");
    })
})

//show routing
app.get("/listings/:id", wrapAsync(async(req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id).populate({path: "reviews",populate: {path: "user",model: "User"}});
    if(!listing)
    {
        req.flash("error","Listing you requested does not exist!");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs",{listing});
}));

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page not found"));
});

//defining a middleware
app.use((err,req,res,next)=>{
    let{statusCode = 500,message="Something went wrong"}=err;
    res.status(statusCode).render("error.ejs",{err})
   // res.status(statusCode).send(message);
});



// app.get("/testListing",async(req,res)=>{
//     const listing1=new Listing({
//         title:"my new villa",
//         description:"by the beach",
//         price:1200,
//         location:"Goa",
//         country:"india",
//     })
//     await listing1.save();
//     console.log("sample was saved");
//     res.send("connection succesful");
// });



