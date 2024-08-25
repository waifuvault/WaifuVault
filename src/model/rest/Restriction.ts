import { Any, Description, Enum, Name, Property } from "@tsed/schema";
import RestrictionType from "../constants/RestrictionType.js";
import type { RestrictionValueType } from "../../utils/typeings.js";

@Name("WaifuRestriction")
export class Restriction {
    @Description("The type of Restriction")
    @Enum(RestrictionType)
    @Property()
    public type: RestrictionType;

    @Description("The value of the restriction")
    @Any(String, Number)
    @Property()
    public value: RestrictionValueType;
}
