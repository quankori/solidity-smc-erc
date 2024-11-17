import merkle from "../utils/merkle_tree";

async function main() {
  console.log("Pending");
  const array = ["address_1", "address_2", "address_3"];
  const result = merkle.hash(array);
  const stringHash = merkle.convert(result);
  console.log(stringHash);
  const verify = merkle.verify("address_3", result);
  console.log(verify)
  console.log("Completed");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
