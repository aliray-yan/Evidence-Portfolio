using System.ComponentModel.DataAnnotations;

namespace BaggageService.Models;

public record CreateBaggageItemRequest(
    [Required, StringLength(20)] string TagId,
    [Required] Guid PassengerId,
    [Required] Guid FlightId,
    [Range(0.01, 200)] decimal WeightKg
);

public record UpdateBaggageStatusRequest(
    [Required, RegularExpression("CheckedIn|ScannedAtGate|Loaded|Claimed")] string Status
);
