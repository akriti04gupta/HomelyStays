const mongoose= require("mongoose");
const Schema=mongoose.Schema;
const Review=require("./review.js");

const listingSchema=new mongoose.Schema(
    {
        title:{
            type: String,
            required: true,
            },
        description:String,
        image:{
            default:"https://www.google.com/url?sa=i&url=https%3A%2F%2Fpngtree.com%2Fso%2Fdefault&psig=AOvVaw2wyMFhUH1oq26QbRHT67bp&ust=1735558922419000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCKiu8obzzIoDFQAAAAAdAAAAABAE",
            type: String,
            set : (v)=> v===""? "https://www.google.com/url?sa=i&url=https%3A%2F%2Fpngtree.com%2Fso%2Fdefault&psig=AOvVaw2wyMFhUH1oq26QbRHT67bp&ust=1735558922419000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCKiu8obzzIoDFQAAAAAdAAAAABAE" :v,
        },
        price:Number,
        location:String,
        country:String,
        reviews: [
            {
                type:Schema.Types.ObjectId,
                ref:"Review"
            }
        ],
    });
listingSchema.post("findOneAndDelete",async(listing)=>{
    if(listing)
    {
        await Review.deleteMany({_id : {$in: listing.reviews}});
    }
});

const Listing = mongoose.model("Listing",listingSchema);
module.exports=Listing;