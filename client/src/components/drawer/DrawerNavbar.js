import DrawerToggle from "../navbar/drawerToggle";

export default function Navbar(props) {
  return (
    <>
      <div className="w-full flex justify-between navbar bg-base-300">
        <DrawerToggle />
        <div className="flex-1 px-2 mx-2 hidden lg:block ">
          <label className="btn btn-ghost normal-case text-xl">
            {props.title}
          </label>
        </div>
        {props.children}
      </div>
    </>
  );
}
