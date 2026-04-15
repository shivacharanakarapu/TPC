using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;
using TPC.Models;

namespace TPC.Services
{
    public class ParcelService
    {
        private readonly IDbConnection _db;

        public ParcelService(IDbConnection db)
        {
            _db = db;
        }

        public async Task<Parcel> GetParcelById(string id)
        {
            // This is the SQL command that runs on the state server
            string sql = "SELECT * FROM Parcels WHERE ParcelID = @ParcelID";

            // Dapper makes this super easy
            return await _db.QueryFirstOrDefaultAsync<Parcel>(sql, new { ParcelID = id });
        }
    }
}
