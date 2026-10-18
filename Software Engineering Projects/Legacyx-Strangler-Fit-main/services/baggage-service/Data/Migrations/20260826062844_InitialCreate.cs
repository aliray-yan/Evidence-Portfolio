using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaggageService.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BaggageItems",
                columns: table => new
                {
                    TagId = table.Column<string>(type: "text", nullable: false),
                    PassengerId = table.Column<Guid>(type: "uuid", nullable: false),
                    FlightId = table.Column<Guid>(type: "uuid", nullable: false),
                    WeightKg = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BaggageItems", x => x.TagId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BaggageItems_FlightId",
                table: "BaggageItems",
                column: "FlightId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BaggageItems");
        }
    }
}
