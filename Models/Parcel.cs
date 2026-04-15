namespace TPC.Models
{
    public class Parcel
    {
        // This is the unique ID (e.g., 0000000000)
        public string ParcelID { get; set; }

        // This is the street address (e.g., Broom St)
        public string ParcelAddress { get; set; }

        // We add these because the State database will likely have them
        public string City { get; set; }
        public string OwnerName { get; set; }
        public decimal LandValue { get; set; }
    }
}