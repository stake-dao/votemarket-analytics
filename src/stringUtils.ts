export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export const uppercaseFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const equals = (str1: string, str2: string): boolean => {
    if (!str1 && str2) {
        return false;
    }

    if (!str2 && str1) {
        return false;
    }

    return str1?.toLowerCase() === str2?.toLowerCase();
};

export const isNullAddress = (address: string): boolean => {
	return address === NULL_ADDRESS;
}